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
import { addBucketFund, deleteBucket, toggleBucketCompleted } from "@/app/actions/bucket";
import EditBucketDialog from "@/app/bucket/EditBucketDialog";

export interface BucketItem {
  id: string;
  title: string;
  importance: number;
  targetAmount: number;
  currentAmount: number;
  isAchieved: boolean;
  isCompleted: boolean;
  imageUrl: string | null;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
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

  const progress =
    bucket.targetAmount > 0
      ? Math.min(100, (bucket.currentAmount / bucket.targetAmount) * 100)
      : 0;

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

  function handleToggleCompleted() {
    if (pending) return;
    startTransition(async () => {
      await toggleBucketCompleted(bucket.id);
    });
  }

  const showImage = bucket.imageUrl && !imgError;

  return (
    <>
      <div
        className={`rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${
          bucket.isCompleted
            ? "border-primary ring-2 ring-primary/20"
            : "border-slate-100"
        }`}
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

          {/* 수정 · 완료 — 이미지 상단 */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 active:scale-[0.98] transition-transform duration-150"
              aria-label="목표 수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleCompleted}
              disabled={pending}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/50 active:scale-[0.98] transition-transform duration-150 disabled:opacity-40"
              aria-label={bucket.isCompleted ? "완료 해제" : "완료"}
            >
              {bucket.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-primary fill-primary" />
              ) : (
                <Circle className="h-4 w-4" />
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

        {/* Action bar */}
        <div className="bg-white dark:bg-[#18181B] px-4 py-3 flex items-center gap-2">
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
        </div>
      </div>

      <EditBucketDialog
        bucket={bucket}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
