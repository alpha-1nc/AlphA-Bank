"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Star, Trash2, CheckCircle2, Circle, Pencil } from "lucide-react";
import { addBucketFund, deleteBucket, completeBucket, uncompleteBucket } from "@/app/actions/bucket";
import EditBucketDialog from "@/app/bucket/EditBucketDialog";
import { cn } from "@/lib/utils";

export interface BucketItem {
  id: string;
  title: string;
  importance: number;
  targetAmount: number;
  currentAmount: number;
  isAchieved: boolean;
  isCompleted: boolean;
  /** YYYY-MM-DD */
  completedAt: string | null;
  imageUrl: string | null;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function todayLocalYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/** completedAt: YYYY-MM-DD (서버에서 전달) */
function formatCompletedDateLabel(ymd: string | null): string {
  if (!ymd) return "";
  const day = ymd.slice(0, 10);
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!parts) return "";
  const y = Number(parts[1]);
  const m = Number(parts[2]);
  const d = Number(parts[3]);
  return `${y}년 ${m}월 ${d}일`;
}

interface Props {
  bucket: BucketItem;
}

export default function BucketCard({ bucket }: Props) {
  const [pending, startTransition] = useTransition();
  const [imgError, setImgError] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeDate, setCompleteDate] = useState(() => todayLocalYMD());

  const progress =
    bucket.targetAmount > 0
      ? Math.min(100, (bucket.currentAmount / bucket.targetAmount) * 100)
      : 0;

  const completedDateLabel = formatCompletedDateLabel(bucket.completedAt);

  function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(depositAmount.replace(/,/g, ""), 10);
    if (isNaN(parsed) || parsed <= 0) return;

    startTransition(async () => {
      await addBucketFund(bucket.id, parsed);
      setDepositAmount("");
      setDepositOpen(false);
    });
  }

  function handleDelete() {
    if (!confirm(`"${bucket.title}" 목표를 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      await deleteBucket(bucket.id);
    });
  }

  function handleCompleteClick() {
    if (pending) return;
    if (bucket.isCompleted) {
      startTransition(async () => {
        await uncompleteBucket(bucket.id);
      });
      return;
    }
    setCompleteDate(todayLocalYMD());
    setCompleteDialogOpen(true);
  }

  function handleConfirmComplete(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !completeDate) return;
    startTransition(async () => {
      await completeBucket(bucket.id, completeDate);
      setCompleteDialogOpen(false);
    });
  }

  const showImage = bucket.imageUrl && !imgError;

  return (
    <>
      <div
        className={cn(
          "rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl",
          bucket.isCompleted
            ? "border-emerald-400/80 shadow-[0_8px_32px_rgba(16,185,129,0.18)] ring-2 ring-emerald-400/35"
            : "border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        )}
      >
        {/* Cinematic image area */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {showImage ? (
            <img
              src={bucket.imageUrl!}
              alt={bucket.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20" />
            </div>
          )}

          {/* Gradient mask overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {bucket.isCompleted && (
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-br from-emerald-500/20 via-transparent to-emerald-600/10"
              aria-hidden
            />
          )}

          {/* 수정 · 완료 토글 — 이미지 상단 */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 max-w-[55%] justify-end">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/35 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/55 active:scale-[0.98] transition-transform duration-150"
              aria-label="목표 수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCompleteClick}
              disabled={pending}
              title={bucket.isCompleted ? "탭하면 진행 중으로 되돌립니다" : "탭하면 완료로 표시합니다"}
              className="flex min-h-8 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight shadow-lg backdrop-blur-sm border border-white/35 bg-black/35 text-white hover:bg-black/55 active:scale-[0.98] transition-transform duration-150 disabled:opacity-45 disabled:pointer-events-none"
              aria-label={bucket.isCompleted ? "완료 해제" : "완료로 표시"}
            >
              {bucket.isCompleted ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">완료됨</span>
                </>
              ) : (
                <>
                  <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">완료하기</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom overlay: title + progress */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < bucket.importance ? "fill-amber-400 text-amber-400" : "text-white/20"
                  }`}
                />
              ))}
            </div>
            <h3 className="font-black tracking-tighter text-white text-base leading-tight line-clamp-2 mb-3">
              {bucket.title}
            </h3>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-xs text-white/60 font-medium">
                  {formatKRW(bucket.currentAmount)}
                </span>
                <span className="text-xs font-black tracking-tighter text-white">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 dark:shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-white/40 font-medium">
                목표 {formatKRW(bucket.targetAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* 하단: 미완료는 납입+삭제, 완료는 달성 문구+삭제 (동일 min-height로 카드 길이 맞춤) */}
        <div
          className={cn(
            "px-4 py-3 flex items-center gap-2 min-h-[56px] box-border",
            bucket.isCompleted
              ? "justify-between border-t border-emerald-100 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/35"
              : "bg-white dark:bg-[#18181B]",
          )}
        >
          {bucket.isCompleted ? (
            <>
              <p className="text-sm font-black tracking-tight text-emerald-800 dark:text-emerald-200 pr-2">
                {completedDateLabel ? (
                  <>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">
                      {completedDateLabel}{" "}
                    </span>
                    머니 버킷리스트 달성!
                  </>
                ) : (
                  "머니 버킷리스트 달성!"
                )}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-emerald-700/70 hover:bg-red-50 hover:text-destructive dark:text-emerald-300/80 dark:hover:bg-red-950/40 active:scale-[0.98] transition-transform duration-150 disabled:opacity-40"
                aria-label="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                <DialogTrigger
                  render={
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs rounded-2xl gap-1 border-slate-100 hover:bg-slate-50 flex-1 font-semibold"
                      disabled={pending || bucket.isAchieved}
                    >
                      <Plus className="h-3 w-3" />
                      납입
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-sm rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-black tracking-tighter">
                      납입 금액
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-400 -mt-1">
                    <span className="font-semibold text-slate-700">{bucket.title}</span>
                    에 납입할 금액을 입력하세요.
                  </p>
                  <form onSubmit={handleDeposit} className="mt-1 space-y-4">
                    <Input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min={1}
                      className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 h-11 font-black tracking-tighter dark:text-slate-100"
                    />
                    <DialogFooter className="gap-2">
                      <DialogClose
                        render={
                          <Button type="button" variant="outline" size="sm" className="rounded-xl">
                            취소
                          </Button>
                        }
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={pending || !depositAmount}
                        className="rounded-xl"
                      >
                        {pending ? "저장 중…" : "납입"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="flex h-8 w-8 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-destructive active:scale-[0.98] transition-transform duration-150 disabled:opacity-40 shrink-0"
                aria-label="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black tracking-tighter">달성일 선택</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 -mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{bucket.title}</span>
            을(를) 완료한 날짜를 선택하세요.
          </p>
          <form onSubmit={handleConfirmComplete} className="space-y-4">
            <Input
              type="date"
              value={completeDate}
              onChange={(e) => setCompleteDate(e.target.value)}
              max={todayLocalYMD()}
              className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 h-11 font-mono tabular-nums dark:text-slate-100"
              required
            />
            <DialogFooter className="gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" size="sm" className="rounded-xl">
                    취소
                  </Button>
                }
              />
              <Button type="submit" size="sm" disabled={pending || !completeDate} className="rounded-xl">
                {pending ? "저장 중…" : "완료로 저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EditBucketDialog
        bucket={bucket}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
