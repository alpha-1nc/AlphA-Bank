import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import BucketCard from "@/components/BucketCard";
import AddBucketDialog from "./AddBucketDialog";
import { Button } from "@/components/ui/button";
import { Target, Plus, Star } from "lucide-react";

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

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t3 hidden md:flex font-bold text-foreground mb-1 items-center gap-2 min-w-0">
            <Star className="h-6 w-6 text-primary shrink-0" />
            <span className="break-words">머니 버킷리스트</span>
          </h1>
          <p className="t7 hidden md:block text-fg-tertiary">
            시각적 목표 달성 관리
          </p>
        </div>

        <AddBucketDialog
          trigger={
            <Button
              size="sm"
              className="t7 gap-1 rounded-control bg-primary font-bold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              새 목표 추가
            </Button>
          }
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-card bg-card px-7 py-7 flex flex-col items-center justify-center text-center">
          <Target className="h-16 w-16 text-fg-disabled mb-6" />
          <p className="t6 font-semibold text-fg-secondary">
            등록된 시각적 목표가 없습니다
          </p>
          <p className="t7 mt-1 text-fg-tertiary">
            새 목표 추가 버튼을 눌러 첫 목표를 등록해 보세요
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {items.map((bucket, i) => (
            <div key={bucket.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 75}ms` }}>
              <BucketCard bucket={bucket} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
