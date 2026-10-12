"use client";

import { useState, useTransition } from "react";
import { AMOUNT_INPUT_FORMAT } from "@/lib/number-input";
import { motion } from "motion/react";
import { Minus, Plus, Star, Target } from "lucide-react";
import {
  Badge,
  BottomSheet,
  Button,
  Checkbox,
  Rating,
  ProgressBar,
  TextField,
  useToast,
  Top,
} from "@/components/ui";
import { addBucketFund, completeBucket, uncompleteBucket } from "@/app/actions/bucket";
import BucketFormSheet from "./BucketFormSheet";
import { SPRING, useAllowMotion, useMotionTransition } from "@/components/ui/tds-motion";
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
  return `${Number(parts[1])}년 ${Number(parts[2])}월 ${Number(parts[3])}일`;
}

export default function BucketBoard({ items }: { items: BucketItem[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex justify-end md:hidden">
        <Button size="medium" color="primary" variant="fill" onClick={() => setAdding(true)}>
          새 목표 추가
        </Button>
      </div>
      <Top
        className="hidden px-0 md:block"
        upperGap={0}
        lowerGap={0}
        title={
          <div className="flex min-w-0 items-center gap-2">
            <Top.TitleParagraph size={22}>머니 버킷리스트</Top.TitleParagraph>
            <Badge color="grey" variant="weak" size="small">
              {items.length}개 목표
            </Badge>
          </div>
        }
        subtitleBottom={<Top.SubtitleParagraph size={15}>시각적 목표 달성 관리</Top.SubtitleParagraph>}
        right={<Top.RightButton onClick={() => setAdding(true)}>새 목표 추가</Top.RightButton>}
      />
      <BucketFormSheet open={adding} onClose={() => setAdding(false)} />

      {items.length === 0 ? (
        <div className="rounded-card bg-card px-7 py-7 flex flex-col items-center justify-center text-center">
          <Target className="h-16 w-16 text-fg-disabled mb-6" />
          <p className="t6 font-semibold text-fg-secondary">등록된 시각적 목표가 없습니다</p>
          <p className="t7 mt-1 text-fg-tertiary">새 목표 추가 버튼을 눌러 첫 목표를 등록해 보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((bucket) => (
            <BucketRow key={bucket.id} bucket={bucket} />
          ))}
        </div>
      )}
    </div>
  );
}

const PAY_STEP = 10_000;

/** −/+ 한 덩어리 스피너 (TextField right 슬롯용) */
function AmountSpinner({
  canDecrease,
  onDecrease,
  onIncrease,
}: {
  canDecrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const allowMotion = useAllowMotion();
  const press = useMotionTransition(SPRING.press);
  const tap = allowMotion ? { scale: 0.9 } : undefined;
  return (
    <span
      className="flex h-8 items-center overflow-hidden rounded-pill bg-divider"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <motion.button
        type="button"
        aria-label="10,000원 줄이기"
        disabled={!canDecrease}
        onClick={onDecrease}
        whileTap={canDecrease ? tap : undefined}
        transition={press}
        className="flex h-8 w-9 items-center justify-center disabled:cursor-default"
        style={{ color: canDecrease ? "var(--tk-secondary-fg)" : "var(--tk-disabled-fg)" }}
      >
        <Minus size={16} aria-hidden />
      </motion.button>
      <span aria-hidden className="h-4 w-px" style={{ backgroundColor: "var(--tk-border)" }} />
      <motion.button
        type="button"
        aria-label="10,000원 늘리기"
        onClick={onIncrease}
        whileTap={tap}
        transition={press}
        className="flex h-8 w-9 items-center justify-center"
        style={{ color: "var(--tk-secondary-fg)" }}
      >
        <Plus size={16} aria-hidden />
      </motion.button>
    </span>
  );
}

function BucketRow({ bucket }: { bucket: BucketItem }) {
  const { openToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeDate, setCompleteDate] = useState(() => todayLocalYMD());
  const [imgError, setImgError] = useState(false);
  const allowMotion = useAllowMotion();
  const pressTransition = useMotionTransition(SPRING.press);

  const progress =
    bucket.targetAmount > 0 ? Math.min(100, (bucket.currentAmount / bucket.targetAmount) * 100) : 0;
  const done = progress >= 100;
  const completedDateLabel = formatCompletedDateLabel(bucket.completedAt);
  const showImage = !!bucket.imageUrl && !imgError;

  const infoLine = bucket.isCompleted ? `완료${completedDateLabel ? ` ${completedDateLabel}` : ""}` : "";

  function handleCompleteToggle() {
    if (pending) return;
    if (bucket.isCompleted) {
      startTransition(async () => {
        await uncompleteBucket(bucket.id);
      });
      return;
    }
    setCompleteDate(todayLocalYMD());
    setCompleteOpen(true);
  }

  function handlePay() {
    if (pending || payAmount <= 0) return;
    const amount = payAmount;
    startTransition(async () => {
      await addBucketFund(bucket.id, amount);
      setPayAmount(0);
      openToast(`${formatWon(amount)}을 납입했어요`, { type: "bottom" });
    });
  }

  function handleConfirmComplete() {
    if (pending || !completeDate) return;
    startTransition(async () => {
      await completeBucket(bucket.id, completeDate);
      setCompleteOpen(false);
    });
  }

  return (
    <>
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => setEditOpen(true)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditOpen(true);
          }
        }}
        whileTap={allowMotion ? { scale: 0.98 } : undefined}
        transition={pressTransition}
        className="h-full cursor-pointer overflow-hidden rounded-card bg-card text-left outline-none"
      >
        <div className="relative aspect-video w-full bg-divider">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bucket.imageUrl!}
              alt={bucket.title}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Star className="h-8 w-8" style={{ color: "var(--tk-tertiary-fg)" }} aria-hidden />
            </div>
          )}
          <span
            className="absolute right-3 top-3 flex items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox.Circle
              aria-label={bucket.isCompleted ? "완료 해제" : "완료로 표시"}
              checked={bucket.isCompleted}
              disabled={pending}
              onCheckedChange={handleCompleteToggle}
            />
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn("t4 min-w-0 truncate font-bold", bucket.isCompleted ? "text-fg-tertiary" : "text-foreground")}>
              {bucket.title}
            </h3>
            <span className={cn("shrink-0", bucket.isCompleted && "opacity-40")}>
              <Rating readOnly variant="iconOnly" size="small" value={bucket.importance} max={5} />
            </span>
          </div>
          {infoLine && (
            <p className="t7 mt-1 truncate" style={{ color: "var(--tk-tertiary-fg)" }}>
              {infoLine}
            </p>
          )}
          <div className="mt-4 flex items-baseline gap-1">
            <span className="st9 numeric font-bold text-foreground">{formatWon(bucket.currentAmount)}</span>
            <span className="t7 numeric min-w-0 truncate" style={{ color: "var(--tk-tertiary-fg)" }}>
              / {formatWon(bucket.targetAmount)}
            </span>
            <span className="t7 numeric ml-auto shrink-0 font-semibold text-foreground">{progress.toFixed(0)}%</span>
          </div>
          <ProgressBar
            className="mt-2"
            progress={progress / 100}
            size="normal"
            color={done ? "var(--tk-positive)" : undefined}
          />
          {!bucket.isCompleted && !bucket.isAchieved && (
            <div
              className="mt-4 flex flex-col gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <TextField
                variant="box"
                type="text"
                inputMode="numeric"
                format={AMOUNT_INPUT_FORMAT}
                suffix="원"
                aria-label="납입 금액"
                className="numeric [&_input]:text-center"
                value={String(payAmount)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setPayAmount(isNaN(n) ? 0 : Math.max(0, n));
                }}
                right={
                  <AmountSpinner
                    canDecrease={payAmount > 0}
                    onDecrease={() => setPayAmount((a) => Math.max(0, a - PAY_STEP))}
                    onIncrease={() => setPayAmount((a) => a + PAY_STEP)}
                  />
                }
              />
              <Button size="large" color="primary" variant="fill" display="block" loading={pending} disabled={payAmount <= 0} onClick={handlePay}>
                납입
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      
      <BucketFormSheet bucket={bucket} open={editOpen} onClose={() => setEditOpen(false)} />

      <BottomSheet
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        hasTextField
        header={<BottomSheet.Header>달성일 선택</BottomSheet.Header>}
        cta={
          <BottomSheet.CTA loading={pending} disabled={!completeDate} onClick={handleConfirmComplete}>
            완료로 저장
          </BottomSheet.CTA>
        }
      >
        <div className="flex flex-col gap-4 pb-1 pt-2">
          <p className="t7 text-fg-tertiary">
            <span className="font-semibold text-foreground">{bucket.title}</span>을(를) 완료한 날짜를 선택하세요.
          </p>
          <TextField
            variant="box"
            label="달성일"
            labelOption="sustain"
            type="date"
            max={todayLocalYMD()}
            value={completeDate}
            onChange={(e) => setCompleteDate(e.target.value)}
          />
        </div>
      </BottomSheet>
    </>
  );
}
