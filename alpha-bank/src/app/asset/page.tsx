import { prisma } from "@/lib/prisma";
import AssetBoardClient from "@/components/asset/AssetBoardClient";

export const dynamic = "force-dynamic";

export default async function AssetStatusPage() {
  let accounts: Awaited<ReturnType<typeof prisma.account.findMany>> = [];
  try {
    accounts = await prisma.account.findMany({
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.error("Asset: DB 조회 실패", err);
  }

  // Group by type
  const grouped: Record<string, typeof accounts> = {};
  for (const acc of accounts) {
    if (!grouped[acc.type]) grouped[acc.type] = [];
    grouped[acc.type].push(acc);
  }

  const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);

  return (
    <AssetBoardClient grouped={grouped} totalNetWorth={totalNetWorth} />
  );
}
