import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { BucketItem } from "@/components/BucketCard";
import { cn } from "@/lib/utils";

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface Props {
  bucket: BucketItem | null;
}

/** 대시보드 표시 전용. 수정은 머니 버킷리스트 메뉴에서 — 저장 시 revalidate로 동기화됩니다. */
export default function PrimeBucketDashboardCard({ bucket }: Props) {
  const bucketProgress =
    bucket && bucket.targetAmount > 0
      ? Math.min(100, (bucket.currentAmount / bucket.targetAmount) * 100)
      : 0;

  const showEmpty = !bucket;
  const hasImage = Boolean(bucket?.imageUrl);

  return (
    <div
      className={cn(
        "md:col-span-2 rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative min-h-[320px] flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl",
        showEmpty ? "justify-center bg-white dark:bg-[#18181B]" : "justify-end",
      )}
      style={
        showEmpty
          ? undefined
          : hasImage
            ? {
                backgroundImage: `url(${bucket!.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)",
              }
      }
    >
      {!showEmpty && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      )}

      <div
        className={cn(
          "relative z-10 p-7 w-full",
          showEmpty && "text-center flex flex-col items-center justify-center",
        )}
      >
        {bucket ? (
          <>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white leading-tight mb-4">
              {bucket.title}
            </h2>

            <div className="mb-3">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-white/70">
                  {formatKRW(bucket.currentAmount)}
                </span>
                <span className="text-sm font-black text-white tracking-tighter">
                  {bucketProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 dark:shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                  style={{ width: `${bucketProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-white/40 font-medium">
                  현재
                </span>
                <span className="text-xs text-white/60 font-semibold">
                  목표 {formatKRW(bucket.targetAmount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-white/40 font-medium">
              {formatKRW(bucket.targetAmount - bucket.currentAmount)} 남음
            </p>
          </>
        ) : (
          <div className="text-center py-6 flex flex-col items-center">
            <AlertCircle className="h-9 w-9 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
              머니 버킷리스트가 없습니다
            </p>
            <Link
              href="/bucket"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/20 transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:ring-primary/25 dark:hover:bg-primary/20"
            >
              머니 버킷리스트 등록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
