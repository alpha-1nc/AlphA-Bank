/**
 * Workplace.color 컬럼 제거 (멱등).
 * 스키마(schema.prisma)에서는 이미 빠졌지만 DB에는 `color TEXT NOT NULL`(기본값 없음)이 남아 있어
 * 근무지 생성이 NOT NULL 오류로 실패한다. 테이블을 재생성하지 않고
 * `ALTER TABLE Workplace DROP COLUMN color` 한 줄만 실행한다. 다른 테이블은 건드리지 않는다.
 *
 * 실행: node scripts/drop-workplace-color.cjs
 * 대상 DB: DATABASE_URL(file:) 또는 prisma/dev.db (remove-my-profile.cjs와 동일한 규칙)
 *
 * PRAGMA foreign_keys는 연결 단위이고 트랜잭션 안에서는 효력이 없으므로,
 * 트랜잭션(BEGIN/COMMIT)을 같은 연결에서 직접 열고 PRAGMA는 트랜잭션 밖에서 바꾼다.
 * 그래서 file: DB에서만 동작한다.
 */
const path = require("path");
const { createClient } = require("@libsql/client");

// 기본값은 개발 DB 기준. 운영 DB 행 수가 다르면 환경변수로 지정한다.
//   EXPECT_WORKPLACE=3 EXPECT_WORKRECORD=120 node scripts/drop-workplace-color.cjs
const EXPECTED = {
  Workplace: Number(process.env.EXPECT_WORKPLACE ?? 2),
  WorkRecord: Number(process.env.EXPECT_WORKRECORD ?? 37),
};

function resolveUrl() {
  const env = (process.env.DATABASE_URL || "").trim();
  if (env) return env;
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

async function scalar(db, sql, args = []) {
  return Number((await db.execute({ sql, args })).rows[0].n);
}

async function getDdl(db) {
  const r = await db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'Workplace'");
  return r.rows[0] ? String(r.rows[0].sql) : null;
}

async function hasColorColumn(db) {
  const cols = (await db.execute("PRAGMA table_info(Workplace)")).rows;
  return cols.some((c) => c.name === "color");
}

async function counts(db) {
  return {
    workplace: await scalar(db, "SELECT COUNT(*) AS n FROM Workplace"),
    workRecord: await scalar(db, "SELECT COUNT(*) AS n FROM WorkRecord"),
    cashFlowByWorkplace: await scalar(db, "SELECT COUNT(*) AS n FROM CashFlow WHERE workplaceId IS NOT NULL"),
    orphanWorkRecord: await scalar(
      db,
      "SELECT COUNT(*) AS n FROM WorkRecord WHERE workplaceId NOT IN (SELECT id FROM Workplace)",
    ),
  };
}

function printCounts(label, c) {
  console.log(
    `${label}: Workplace ${c.workplace} / WorkRecord ${c.workRecord} / CashFlow(Workplace 참조) ${c.cashFlowByWorkplace} / 고아 WorkRecord ${c.orphanWorkRecord}`,
  );
}

async function fkValue(db) {
  return Number((await db.execute("PRAGMA foreign_keys")).rows[0].foreign_keys);
}

async function main() {
  const url = resolveUrl();
  console.log("대상 DB:", url.replace(/(authToken=).*/, "$1***"));
  if (!url.startsWith("file:")) {
    console.error("중단: file: DB에서만 실행할 수 있습니다 (같은 연결에서 PRAGMA와 트랜잭션을 다루기 때문).");
    process.exit(1);
  }
  const db = createClient({ url });

  // 1. 실행 전 출력
  const ddlBefore = await getDdl(db);
  if (!ddlBefore) throw new Error("Workplace 테이블이 없습니다.");
  console.log("[실행 전 DDL]\n" + ddlBefore);
  const before = await counts(db);
  printCounts("[실행 전]", before);

  // 2. 멱등: 이미 처리됨
  if (!(await hasColorColumn(db))) {
    console.log("이미 처리됨 (변경 없음)");
    return;
  }

  // 3. 사전 검사
  const version = String((await db.execute("SELECT sqlite_version() AS v")).rows[0].v);
  console.log(`sqlite_version(): ${version}`);
  const [maj, min] = version.split(".").map(Number);
  if (maj < 3 || (maj === 3 && min < 35)) {
    console.error(`중단: SQLite ${version}은 DROP COLUMN(3.35 이상 필요)을 지원하지 않습니다.`);
    process.exitCode = 1;
    return;
  }
  const problems = [];
  if (before.workplace !== EXPECTED.Workplace) problems.push(`Workplace: 기대 ${EXPECTED.Workplace} / 실제 ${before.workplace}`);
  if (before.workRecord !== EXPECTED.WorkRecord) problems.push(`WorkRecord: 기대 ${EXPECTED.WorkRecord} / 실제 ${before.workRecord}`);
  if (problems.length > 0) {
    for (const p of problems) console.error(`  - ${p}`);
    console.error("중단: 사전 검사 실패. 아무것도 바꾸지 않았습니다.");
    process.exitCode = 1;
    return;
  }

  // 4. 실행
  const fkOriginal = await fkValue(db);
  console.log(`PRAGMA foreign_keys 현재 값: ${fkOriginal ? "ON" : "OFF"}`);
  if (fkOriginal) {
    await db.execute("PRAGMA foreign_keys = OFF");
    if ((await fkValue(db)) !== 0) throw new Error("foreign_keys를 OFF로 바꾸지 못했습니다.");
    console.log("foreign_keys를 OFF로 변경 (작업 후 복구)");
  }

  let committed = false;
  try {
    await db.execute("BEGIN IMMEDIATE");
    try {
      await db.execute("ALTER TABLE Workplace DROP COLUMN color");

      // 5. 실행 후 검증 (하나라도 어긋나면 에러 → 롤백)
      const ddlAfter = await getDdl(db);
      console.log("[실행 후 DDL]\n" + ddlAfter);
      if (await hasColorColumn(db)) throw new Error("color 컬럼이 아직 남아 있습니다.");

      const after = await counts(db);
      printCounts("[실행 후]", after);
      if (after.workplace !== EXPECTED.Workplace) throw new Error(`Workplace 행 수가 ${after.workplace} (기대 ${EXPECTED.Workplace})`);
      if (after.workRecord !== EXPECTED.WorkRecord) throw new Error(`WorkRecord 행 수가 ${after.workRecord} (기대 ${EXPECTED.WorkRecord})`);
      if (after.cashFlowByWorkplace !== before.cashFlowByWorkplace) {
        throw new Error(`CashFlow(Workplace 참조) ${before.cashFlowByWorkplace} → ${after.cashFlowByWorkplace}`);
      }
      if (after.orphanWorkRecord !== 0) throw new Error(`고아 WorkRecord ${after.orphanWorkRecord}건`);

      const fkViolations = (await db.execute("PRAGMA foreign_key_check")).rows.length;
      console.log(`PRAGMA foreign_key_check: ${fkViolations}건`);
      if (fkViolations !== 0) throw new Error(`foreign_key_check 위반 ${fkViolations}건`);

      await db.execute("COMMIT");
      committed = true;
    } catch (err) {
      if (!committed) {
        try {
          await db.execute("ROLLBACK");
          console.error("롤백했습니다.");
        } catch {
          /* 트랜잭션이 이미 종료됨 */
        }
      }
      throw err;
    }
  } finally {
    if (fkOriginal) {
      await db.execute("PRAGMA foreign_keys = ON");
      console.log(`foreign_keys 복구: ${(await fkValue(db)) ? "ON" : "OFF"}`);
    }
  }

  // 6.
  console.log("완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
