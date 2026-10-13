import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import AssetBoardClient from "@/components/asset/AssetBoardClient";

export const dynamic = "force-dynamic";

export default async function AssetStatusPage() {
  const userId = await getCurrentUserId();
  let accounts: Awaited<ReturnType<typeof prisma.account.findMany>> = [];
  try {
    accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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

  return (
    <AssetBoardClient grouped={grouped} />
  );
}
