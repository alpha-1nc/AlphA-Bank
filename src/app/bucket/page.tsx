import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import BucketBoard from "./BucketBoard";

export const dynamic = "force-dynamic";

export default async function BucketListPage() {
  const userId = await getCurrentUserId();
  let buckets: Awaited<ReturnType<typeof prisma.bucketList.findMany>> = [];
  try {
    buckets = await prisma.bucketList.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("Bucket: DB 조회 실패", err);
  }

  const items = buckets.map((b) => ({
    id: b.id,
    title: b.title,
    importance: b.importance,
    targetAmount: b.targetAmount,
    currentAmount: b.currentAmount,
    isAchieved: b.isAchieved,
    isCompleted: b.isCompleted,
    completedAt: b.completedAt ? b.completedAt.toISOString().slice(0, 10) : null,
    imageUrl: b.imageUrl,
  }));

  return <BucketBoard items={items} />;
}
