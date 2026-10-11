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
import { formatWon } from "@/lib/format-money";

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

  const showImage = !!bucket.imageUrl && !imgError;
  const done = progress >= 100;
  /** 이미지 위(어두운 오버레이) 글자 / 이미지 없을 때 card 위 글자 */
  const onImage = showImage;
  const titleColor = onImage ? "text-white" : "text-foreground";
  const metaColor = onImage ? "text-white/70" : "text-fg-tertiary";
  const overlayBtn = onImage
    ? "bg-black/35 text-white hover:bg-black/55"
    : "bg-divider text-fg-secondary hover:bg-divider";

  return (
    <>
      <div
        className="rounded-card bg-card overflow-hidden flex flex-col"
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
            <div className="absolute inset-0 bg-card" />
          )}

          {/* 이미지 위 글자가 읽히도록 일정한 어두운 오버레이 (이미지 있을 때만) */}
          {showImage && <div className="absolute inset-0 bg-black/45" aria-hidden />}

          {/* 수정 · 완료 토글 — 이미지 상단 */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10 max-w-[60%] justify-end">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-control backdrop-blur-sm active:scale-[0.97] transition-transform duration-150 touch-manipulation", overlayBtn)}
              aria-label="목표 수정"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCompleteClick}
              disabled={pending}
              title={bucket.isCompleted ? "탭하면 진행 중으로 되돌립니다" : "탭하면 완료로 표시합니다"}
              className={cn("t7 flex min-h-10 items-center justify-center gap-1 rounded-control px-3 py-2 font-bold backdrop-blur-sm active:scale-[0.97] transition-transform duration-150 disabled:opacity-45 disabled:pointer-events-none touch-manipulation", overlayBtn)}
              aria-label={bucket.isCompleted ? "완료 해제" : "완료로 표시"}
            >
              {bucket.isCompleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">완료됨</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 shrink-0" aria-hidden />
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
                  className={cn(
                    "h-3 w-3",
                    i < bucket.importance
                      ? onImage
                        ? "fill-white text-white"
                        : "fill-foreground text-foreground"
                      : onImage
                        ? "text-white/35"
                        : "text-fg-disabled"
                  )}
                />
              ))}
            </div>
            <h3 className={cn("t5 font-bold line-clamp-2 mb-3", titleColor)}>
              {bucket.title}
            </h3>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className={cn("t7 numeric font-medium", metaColor)}>
                  {formatWon(bucket.currentAmount)}
                </span>
                <span className={cn("t7 numeric font-bold", titleColor)}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-divider rounded-pill overflow-hidden">
                <div
                  className={cn("h-full rounded-pill transition-all duration-500", done ? "bg-positive" : "bg-primary")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={cn("t8 numeric font-medium", metaColor)}>
                목표 {formatWon(bucket.targetAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* 하단: 미완료는 납입+삭제, 완료는 달성 문구+삭제 (동일 min-height로 카드 길이 맞춤) */}
        <div
          className={cn(
            "px-4 py-3 flex items-center gap-2 min-h-[64px] box-border border-t border-divider",
            bucket.isCompleted && "justify-between",
          )}
        >
          {bucket.isCompleted ? (
            <>
              <p className="t7 flex min-w-0 items-center gap-2 pr-2 text-fg-secondary">
                <span className="t8 shrink-0 rounded-pill bg-positive/15 px-2 py-0.5 font-bold text-positive">완료</span>
                <span className="min-w-0">
                  {completedDateLabel ? (
                    <>
                      <span className="numeric font-semibold text-foreground">{completedDateLabel} </span>
                      머니 버킷리스트 달성!
                    </>
                  ) : (
                    "머니 버킷리스트 달성!"
                  )}
                </span>
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-fg-tertiary hover:text-negative active:scale-[0.97] transition-transform duration-150 disabled:opacity-40 touch-manipulation"
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4" />
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
                      className="t7 h-10 flex-1 gap-1 rounded-control border-0 bg-primary font-semibold text-primary-foreground hover:bg-primary hover:opacity-90 touch-manipulation"
                      disabled={pending || bucket.isAchieved}
                    >
                      <Plus className="h-4 w-4" />
                      납입
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-sm rounded-card">
                  <DialogHeader>
                    <DialogTitle className="t5 font-bold text-foreground">
                      납입 금액
                    </DialogTitle>
                  </DialogHeader>
                  <p className="t7 text-fg-tertiary">
                    <span className="font-semibold text-foreground">{bucket.title}</span>
                    에 납입할 금액을 입력하세요.
                  </p>
                  <form onSubmit={handleDeposit} className="mt-1 space-y-4">
                    <Input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min={1}
                      className="t6 h-11 rounded-control border-0 bg-background text-foreground numeric font-bold"
                    />
                    <DialogFooter className="gap-2">
                      <DialogClose
                        render={
                          <Button type="button" variant="outline" size="sm" className="rounded-control border-0 bg-divider text-foreground hover:bg-divider">
                            취소
                          </Button>
                        }
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={pending || !depositAmount}
                        className="rounded-control bg-primary font-bold text-primary-foreground"
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
                className="flex h-10 w-10 items-center justify-center rounded-control text-fg-tertiary hover:text-negative active:scale-[0.97] transition-transform duration-150 disabled:opacity-40 shrink-0 touch-manipulation"
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-card">
          <DialogHeader>
            <DialogTitle className="t5 font-bold text-foreground">달성일 선택</DialogTitle>
          </DialogHeader>
          <p className="t7 text-fg-tertiary">
            <span className="font-semibold text-foreground">{bucket.title}</span>
            을(를) 완료한 날짜를 선택하세요.
          </p>
          <form onSubmit={handleConfirmComplete} className="space-y-4">
            <Input
              type="date"
              value={completeDate}
              onChange={(e) => setCompleteDate(e.target.value)}
              max={todayLocalYMD()}
              className="t6 h-11 rounded-control border-0 bg-background text-foreground numeric"
              required
            />
            <DialogFooter className="gap-2">
              <DialogClose
                render={
                  <Button type="button" variant="outline" size="sm" className="rounded-control border-0 bg-divider text-foreground hover:bg-divider">
                    취소
                  </Button>
                }
              />
              <Button type="submit" size="sm" disabled={pending || !completeDate} className="rounded-control bg-primary font-bold text-primary-foreground">
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
