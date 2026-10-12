/**
 * Account.type "금고" → "목적자금" 이름 변경 (멱등).
 * UPDATE 한 건만 실행하고, 전체 계좌 수가 달라지면 롤백 후 중단한다.
 *
 * 실행: node scripts/rename-account-type-safe.cjs
 * 대상 DB: DATABASE_URL(file:) 또는 prisma/dev.db (앱과 동일한 규칙)
 */
const path = require("path");
const { createClient } = require("@libsql/client");

function resolveUrl() {
  const env = (process.env.DATABASE_URL || "").trim();
  if (env) return env;
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

async function count(db, where, args = []) {
  const sql = `SELECT COUNT(*) AS n FROM Account${where ? ` WHERE ${where}` : ""}`;
  return Number((await db.execute({ sql, args })).rows[0].n);
}

async function main() {
  const url = resolveUrl();
  console.log("대상 DB:", url.replace(/(authToken=).*/, "$1***"));
  const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

  const tx = await db.transaction("write");
  try {
    const total = await count(tx, "");
    const oldBefore = await count(tx, "type = ?", ["금고"]);
    const newBefore = await count(tx, "type = ?", ["목적자금"]);
    console.log(`[실행 전] 전체 ${total} / 금고 ${oldBefore} / 목적자금 ${newBefore}`);

    await tx.execute({ sql: "UPDATE Account SET type = ? WHERE type = ?", args: ["목적자금", "금고"] });

    const totalAfter = await count(tx, "");
    const oldAfter = await count(tx, "type = ?", ["금고"]);
    const newAfter = await count(tx, "type = ?", ["목적자금"]);
    console.log(`[실행 후] 전체 ${totalAfter} / 금고 ${oldAfter} / 목적자금 ${newAfter}`);

    if (totalAfter !== total || oldAfter !== 0 || newAfter !== newBefore + oldBefore) {
      await tx.rollback();
      console.error("개수가 맞지 않아 롤백하고 중단했습니다.");
      process.exitCode = 1;
      return;
    }
    await tx.commit();
    console.log("완료");
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
