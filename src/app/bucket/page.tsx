import { prisma } from "@/lib/prisma";
import BucketCard from "@/components/BucketCard";
import AddBucketDialog from "./AddBucketDialog";
import { Button } from "@/components/ui/button";
import { Target, Plus, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BucketListPage() {
  let buckets: Awaited<ReturnType<typeof prisma.bucketList.findMany>> = [];
  try {
    buckets = await prisma.bucketList.findMany({
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
    <div className="p-6 md:p-8 lg:p-10 space-y-8 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2.5 min-w-0">
            <Star className="h-8 w-8 text-primary shrink-0" />
            <span className="break-words">머니 버킷리스트</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            시각적 목표 달성 관리
          </p>
        </div>

        <AddBucketDialog
          trigger={
            <Button
              size="sm"
              className="gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/90 text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              새 목표 추가
            </Button>
          }
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-8 py-20 flex flex-col items-center justify-center text-center">
          <Target className="h-16 w-16 text-slate-300 mb-6" />
          <p className="text-base font-semibold text-slate-500">
            등록된 시각적 목표가 없습니다
          </p>
          <p className="mt-1 text-sm text-slate-400">
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
