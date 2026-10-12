/**
 * MY 프로필 제거 (멱등).
 * 삭제 대상은 아래 두 행뿐이다.
 *   - MonthlyBudget id = 3763c34a-a890-45fc-9314-0be439496b25 (userId = user-my, 2026-04)
 *   - User id = user-my
 * 전 과정이 하나의 트랜잭션이며, 사전/사후 검증이 하나라도 어긋나면 롤백하고 중단한다.
 * 이미 처리된 상태(둘 다 없음)면 "이미 처리됨"만 출력하고 아무것도 바꾸지 않는다.
 *
 * 실행: node scripts/remove-my-profile.cjs
 * 대상 DB: DATABASE_URL(file:) 또는 prisma/dev.db (rename-account-type-safe.cjs와 동일한 규칙)
 */
const path = require("path");
const { createClient } = require("@libsql/client");

const JK_ID = "74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0";
const MY_ID = "user-my";
const MY_BUDGET_ID = "3763c34a-a890-45fc-9314-0be439496b25";
const MY_BUDGET_MONTH = "2026-04";

const EXPECTED_JK = {
  Account: 7,
  MonthlyBudget: 11,
  CashFlow: 18,
  BucketList: 2,
  Subscription: 2,
  Workplace: 2,
  WorkRecord: 37,
};
const MODELS = Object.keys(EXPECTED_JK);

function resolveUrl() {
  const env = (process.env.DATABASE_URL || "").trim();
  if (env) return env;
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

async function scalar(db, sql, args = []) {
  return Number((await db.execute({ sql, args })).rows[0].n);
}

/** 소유자(userId) 기준 모델별 행 수. CashFlow/WorkRecord는 부모를 경유한다. */
async function countByOwner(db, userId) {
  return {
    Account: await scalar(db, "SELECT COUNT(*) AS n FROM Account WHERE userId = ?", [userId]),
    MonthlyBudget: await scalar(db, "SELECT COUNT(*) AS n FROM MonthlyBudget WHERE userId = ?", [userId]),
    CashFlow: await scalar(
      db,
      "SELECT COUNT(*) AS n FROM CashFlow c JOIN MonthlyBudget mb ON mb.id = c.monthlyBudgetId WHERE mb.userId = ?",
      [userId],
    ),
    BucketList: await scalar(db, "SELECT COUNT(*) AS n FROM BucketList WHERE userId = ?", [userId]),
    Subscription: await scalar(db, "SELECT COUNT(*) AS n FROM Subscription WHERE userId = ?", [userId]),
    Workplace: await scalar(db, "SELECT COUNT(*) AS n FROM Workplace WHERE userId = ?", [userId]),
    WorkRecord: await scalar(
      db,
      "SELECT COUNT(*) AS n FROM WorkRecord r JOIN Workplace w ON w.id = r.workplaceId WHERE w.userId = ?",
      [userId],
    ),
  };
}

function printCounts(label, counts) {
  console.log(`${label}: ` + MODELS.map((m) => `${m} ${counts[m]}`).join(" / "));
}

/** 소유자가 User 테이블에 없는 행 수 (직접 소유 5개 모델 + 부모가 없는 CashFlow/WorkRecord) */
async function countOrphans(db) {
  const notInUser = (t) =>
    scalar(db, `SELECT COUNT(*) AS n FROM ${t} WHERE userId NOT IN (SELECT id FROM User)`);
  let n = 0;
  for (const t of ["Account", "MonthlyBudget", "BucketList", "Subscription", "Workplace"]) {
    n += await notInUser(t);
  }
  n += await scalar(
    db,
    `SELECT COUNT(*) AS n FROM CashFlow
     WHERE monthlyBudgetId NOT IN (SELECT id FROM MonthlyBudget)
        OR (workplaceId IS NOT NULL AND workplaceId NOT IN (SELECT id FROM Workplace))`,
  );
  n += await scalar(db, "SELECT COUNT(*) AS n FROM WorkRecord WHERE workplaceId NOT IN (SELECT id FROM Workplace)");
  return n;
}

async function main() {
  const url = resolveUrl();
  console.log("대상 DB:", url.replace(/(authToken=).*/, "$1***"));
  const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

  const tx = await db.transaction("write");
  let finished = false;
  async function abort(reason) {
    console.error(`중단: ${reason}`);
    await tx.rollback();
    finished = true;
    process.exitCode = 1;
  }

  try {
    // 1. 실행 전 집계
    const users = (await tx.execute("SELECT id, name FROM User ORDER BY id")).rows;
    console.log("[User 목록]");
    for (const u of users) console.log(`  ${u.id} (${u.name})`);

    const jkBefore = await countByOwner(tx, JK_ID);
    const myBefore = await countByOwner(tx, MY_ID);
    printCounts("[실행 전] JK", jkBefore);
    printCounts("[실행 전] MY", myBefore);

    const myUserExists = await scalar(tx, "SELECT COUNT(*) AS n FROM User WHERE id = ?", [MY_ID]);
    const myBudgetExists = await scalar(tx, "SELECT COUNT(*) AS n FROM MonthlyBudget WHERE id = ?", [MY_BUDGET_ID]);

    // 5. 멱등: 이미 처리된 상태
    if (myUserExists === 0 && myBudgetExists === 0) {
      const myLeft = MODELS.reduce((s, m) => s + myBefore[m], 0);
      if (myLeft !== 0) {
        return await abort(`'${MY_ID}' User는 없는데 MY 소유 행이 ${myLeft}건 남아 있습니다. 수동 확인 필요.`);
      }
      await tx.rollback(); // 변경 없음
      finished = true;
      console.log("이미 처리됨 (변경 없음)");
      return;
    }

    // 2. 사전 안전 검사
    const problems = [];
    for (const m of MODELS) {
      if (jkBefore[m] !== EXPECTED_JK[m]) problems.push(`JK ${m}: 기대 ${EXPECTED_JK[m]} / 실제 ${jkBefore[m]}`);
    }
    if (myUserExists !== 1) problems.push(`User '${MY_ID}' 행이 존재하지 않음 (${myUserExists}건)`);

    for (const m of ["Account", "BucketList", "Subscription", "Workplace", "WorkRecord"]) {
      if (myBefore[m] !== 0) problems.push(`MY ${m}: 0이어야 하는데 ${myBefore[m]}건`);
    }
    if (myBefore.MonthlyBudget !== 1) problems.push(`MY MonthlyBudget: 1이어야 하는데 ${myBefore.MonthlyBudget}건`);
    if (myBefore.CashFlow !== 0) problems.push(`MY CashFlow: 0이어야 하는데 ${myBefore.CashFlow}건`);

    const target = (
      await tx.execute({ sql: "SELECT userId, month FROM MonthlyBudget WHERE id = ?", args: [MY_BUDGET_ID] })
    ).rows[0];
    if (!target) {
      problems.push(`MonthlyBudget '${MY_BUDGET_ID}' 행이 존재하지 않음`);
    } else if (target.userId !== MY_ID || target.month !== MY_BUDGET_MONTH) {
      problems.push(
        `MonthlyBudget '${MY_BUDGET_ID}' 내용 불일치: userId=${target.userId}, month=${target.month} (기대 ${MY_ID}, ${MY_BUDGET_MONTH})`,
      );
    }
    const targetCashFlows = await scalar(
      tx,
      "SELECT COUNT(*) AS n FROM CashFlow WHERE monthlyBudgetId = ?",
      [MY_BUDGET_ID],
    );
    if (targetCashFlows !== 0) problems.push(`삭제 대상 MonthlyBudget에 딸린 CashFlow ${targetCashFlows}건 (0이어야 함)`);

    if (problems.length > 0) {
      for (const p of problems) console.error(`  - ${p}`);
      return await abort("사전 안전 검사 실패. 아무것도 삭제하지 않았습니다.");
    }
    console.log("사전 안전 검사 통과");

    // 3. 삭제 (정확히 위 두 행만, 항상 id로 지정)
    const delBudget = await tx.execute({
      sql: "DELETE FROM MonthlyBudget WHERE id = ? AND userId = ?",
      args: [MY_BUDGET_ID, MY_ID],
    });
    console.log(`MonthlyBudget 삭제: ${delBudget.rowsAffected}행`);
    if (delBudget.rowsAffected !== 1) return await abort("MonthlyBudget 삭제 행 수가 1이 아님");

    const delUser = await tx.execute({ sql: "DELETE FROM User WHERE id = ?", args: [MY_ID] });
    console.log(`User 삭제: ${delUser.rowsAffected}행`);
    if (delUser.rowsAffected !== 1) return await abort("User 삭제 행 수가 1이 아님");

    // 4. 실행 후 검증
    const jkAfter = await countByOwner(tx, JK_ID);
    printCounts("[실행 후] JK", jkAfter);
    for (const m of MODELS) {
      if (jkAfter[m] !== jkBefore[m]) {
        return await abort(`JK ${m} 행 수가 변함: ${jkBefore[m]} → ${jkAfter[m]}`);
      }
    }

    const usersAfter = (await tx.execute("SELECT id FROM User")).rows;
    if (usersAfter.length !== 1 || usersAfter[0].id !== JK_ID) {
      return await abort(`User 테이블에 JK 1행만 남아야 함 (실제: ${usersAfter.map((u) => u.id).join(", ") || "없음"})`);
    }

    const orphans = await countOrphans(tx);
    console.log(`고아 행: ${orphans}건`);
    if (orphans !== 0) return await abort(`고아 행 ${orphans}건 발견`);

    await tx.commit();
    finished = true;
    console.log("완료");
  } catch (err) {
    if (!finished) {
      try {
        await tx.rollback();
      } catch {
        /* 이미 종료된 트랜잭션 */
      }
    }
    throw err;
  } finally {
    tx.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
