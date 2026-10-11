/**
 * CashFlow 분류 마이그레이션 (멱등).
 *   EXPENSE_FIXED → type=EXPENSE, category=FIXED
 *   EXPENSE_VAR   → type=EXPENSE, category=VARIABLE
 *   SAVING        → type=SAVING,  category=SAVE   (category가 비어 있는 행만)
 *   INCOME        → type=INCOME,  category=null
 * emoji는 건드리지 않는다. 행 삭제 없음, 변환만 수행. 전후 집계를 출력한다.
 *
 * 실행: node scripts/migrate-cashflow-categories.cjs
 * 대상 DB: DATABASE_URL(file:) 또는 prisma/dev.db (앱과 동일한 규칙)
 */
const path = require("path");
const { createClient } = require("@libsql/client");

function resolveUrl() {
  const env = (process.env.DATABASE_URL || "").trim();
  if (env && !env.startsWith("file:")) return env;
  if (env.startsWith("file:")) return env;
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

async function snapshot(db, label) {
  const total = (await db.execute("SELECT COUNT(*) AS n FROM CashFlow")).rows[0].n;
  const rows = (
    await db.execute(
      "SELECT type, category, COUNT(*) AS n, COALESCE(SUM(amount),0) AS s FROM CashFlow GROUP BY type, category ORDER BY type, category"
    )
  ).rows;
  console.log(`\n[${label}] 총 행 수: ${total}`);
  for (const r of rows) {
    console.log(`  type=${r.type} category=${r.category ?? "null"} : ${r.n}행, 금액합 ${r.s}`);
  }
  return { total: Number(total), sum: rows.reduce((a, r) => a + Number(r.s), 0) };
}

async function main() {
  const url = resolveUrl();
  console.log("대상 DB:", url.replace(/(authToken=).*/, "$1***"));
  const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

  const before = await snapshot(db, "마이그레이션 전");

  await db.batch(
    [
      "UPDATE CashFlow SET type='EXPENSE', category='FIXED'    WHERE type='EXPENSE_FIXED'",
      "UPDATE CashFlow SET type='EXPENSE', category='VARIABLE' WHERE type='EXPENSE_VAR'",
      "UPDATE CashFlow SET category='SAVE' WHERE type='SAVING' AND (category IS NULL OR category='')",
      "UPDATE CashFlow SET category=NULL WHERE type='INCOME' AND category IS NOT NULL",
    ],
    "write"
  );

  const after = await snapshot(db, "마이그레이션 후");

  const leftover = (
    await db.execute("SELECT COUNT(*) AS n FROM CashFlow WHERE type IN ('EXPENSE_FIXED','EXPENSE_VAR')")
  ).rows[0].n;
  const invalid = (
    await db.execute(
      "SELECT COUNT(*) AS n FROM CashFlow WHERE type NOT IN ('INCOME','EXPENSE','SAVING') OR (type='EXPENSE' AND (category IS NULL OR category NOT IN ('FIXED','VARIABLE','SPECIAL'))) OR (type='SAVING' AND (category IS NULL OR category NOT IN ('SAVE','INVEST','PURPOSE')))"
    )
  ).rows[0].n;

  console.log(`\n구 타입 잔존: ${leftover}, 유효하지 않은 행: ${invalid}`);
  if (before.total !== after.total || before.sum !== after.sum) {
    console.error("!! 행 수 또는 금액합이 달라졌습니다. 백업에서 복구하세요.");
    process.exit(1);
  }
  console.log("OK: 행 수·금액합 동일, 유실 없음.");
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
