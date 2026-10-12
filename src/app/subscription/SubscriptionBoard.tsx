"use client";

import { useState, useTransition } from "react";
import {
  RefreshCw,
  Tv,
  Sparkles,
  Music,
  Briefcase,
  Cloud,
  Gamepad2,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  ListRow,
  Switch,
  Top,
  useToast,
} from "@/components/ui";
import SubscriptionFormSheet from "./SubscriptionFormSheet";
import {
  toggleSubscriptionActive,
  addAllSubscriptionsToBudget,
} from "@/app/actions/subscription";
import { cn } from "@/lib/utils";
import { formatWon } from "@/lib/format-money";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  isActive: boolean;
  memo: string | null;
}

interface Props {
  subscriptions: Subscription[];
  currentBudgetMonth: string;
  totalMonthly: number;
}

/** 결제일이 오늘 포함 3일 이내로 임박했는지 (D-day 강조용) */
function isBillingImminent(day: number): boolean {
  const diff = day - new Date().getDate();
  return diff >= 0 && diff <= 3;
}

/** 카테고리별 아이콘 (매핑에 없으면 Repeat) */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  스트리밍: Tv,
  AI: Sparkles,
  음악: Music,
  생산성: Briefcase,
  클라우드: Cloud,
  게임: Gamepad2,
};

function getBillingDayLabel(day: number): string {
  const today = new Date().getDate();
  const diff = day - today;
  if (diff === 0) return "오늘 결제";
  if (diff > 0) return `D-${diff}`;
  return `매월 ${day}일`;
}

export default function SubscriptionBoard({ subscriptions, currentBudgetMonth, totalMonthly }: Props) {
  const [adding, setAdding] = useState(false);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [reflectedIds, setReflectedIds] = useState<Set<string>>(new Set());
  const [isPendingAll, startAllTransition] = useTransition();
  const { openToast } = useToast();

  function handleAddAllToBudget() {
    startAllTransition(async () => {
      const result = await addAllSubscriptionsToBudget(currentBudgetMonth);
      if (result.added > 0) {
        openToast(
          `${result.added}개 구독이 예산에 반영되었습니다.${result.skipped > 0 ? ` (${result.skipped}개는 이미 반영됨)` : ""}`,
          { type: "bottom" },
        );
      } else {
        openToast("반영할 구독이 없습니다. (이미 모두 반영되어 있거나 활성 구독이 없습니다)", { type: "bottom" });
      }
    });
  }

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex justify-end md:hidden">
        <Button size="medium" color="primary" variant="fill" onClick={() => setAdding(true)}>
          새 구독 추가
        </Button>
      </div>
      <Top
        className="hidden px-0 md:block"
        upperGap={0}
        lowerGap={0}
        title={
          <div className="flex min-w-0 items-center gap-2">
            <Top.TitleParagraph size={22}>구독 관리</Top.TitleParagraph>
            <Badge color="grey" variant="weak" size="small">
              {subscriptions.length}개 구독
            </Badge>
          </div>
        }
        subtitleBottom={<Top.SubtitleParagraph size={15}>정기 구독 서비스 관리 및 예산 반영</Top.SubtitleParagraph>}
        right={<Top.RightButton onClick={() => setAdding(true)}>새 구독 추가</Top.RightButton>}
      />
      <SubscriptionFormSheet open={adding} onClose={() => setAdding(false)} />

      {/* 총 구독료 */}
      <div className="flex flex-col gap-4 rounded-card bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="t7 text-fg-tertiary">월 총 구독료</p>
          <p className="t2 sm:t1 numeric mt-1 font-bold text-foreground">{formatWon(totalMonthly)}</p>
          <p className="t7 numeric mt-1 text-fg-tertiary">
            활성 구독 {subscriptions.filter((s) => s.isActive).length}건
          </p>
        </div>
        <Button size="medium" color="light" variant="weak" loading={isPendingAll} onClick={handleAddAllToBudget}>
          전체 예산 반영
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-card bg-card px-7 py-7 flex flex-col items-center justify-center text-center">
          <RefreshCw className="h-12 w-12 text-fg-disabled mb-4" />
          <p className="t6 font-semibold text-fg-secondary">등록된 구독이 없습니다</p>
          <p className="t7 text-fg-tertiary mt-1">새 구독 추가 버튼으로 구독을 등록해보세요</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card bg-card">
          {subscriptions.map((sub, i) => (
            <SubscriptionRow
              key={sub.id}
              subscription={sub}
              last={i === subscriptions.length - 1}
              onEdit={() => setEditTarget(sub)}
            />
          ))}
        </div>
      )}

      {editTarget && (
        <SubscriptionFormSheet
          subscription={editTarget}
          open
          onClose={() => setEditTarget(null)}
          currentBudgetMonth={currentBudgetMonth}
          isReflected={reflectedIds.has(editTarget.id)}
          onReflected={() => setReflectedIds((prev) => new Set(prev).add(editTarget.id))}
        />
      )}
    </div>
  );
}

interface RowProps {
  subscription: Subscription;
  last: boolean;
  onEdit: () => void;
}

function SubscriptionRow({ subscription: sub, last, onEdit }: RowProps) {
  const [isPendingToggle, startToggle] = useTransition();

  const billingLabel = getBillingDayLabel(sub.billingDay);
  // 일시정지 행은 전체를 fg-disabled로 흐리게
  const off = !sub.isActive;
  const billingColor = off
    ? "text-fg-disabled"
    : isBillingImminent(sub.billingDay)
      ? "text-primary"
      : "text-fg-tertiary";

  const infoLine = [off ? "일시정지" : null, sub.category, sub.memo].filter(Boolean).join(" · ");
  const Icon = CATEGORY_ICONS[sub.category] ?? Repeat;

  function handleToggle() {
    startToggle(async () => {
      await toggleSubscriptionActive(sub.id);
    });
  }

  return (
    <ListRow
      withTouchEffect
      border={last ? "none" : "indented"}
      verticalPadding="medium"
      onClick={onEdit}
      left={
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-divider">
          <Icon className={cn("h-5 w-5", off ? "text-fg-disabled" : "text-fg-tertiary")} aria-hidden />
        </span>
      }
      contents={
        <div className="flex min-w-0 items-center gap-3">
          <ListRow.Texts
            type="2RowTypeA"
            className="min-w-0 flex-1"
            top={<span className={cn(off && "text-fg-disabled")}>{sub.name}</span>}
            bottom={<span className={cn(off && "text-fg-disabled")}>{infoLine}</span>}
          />
          <ListRow.Texts
            type="Right2RowTypeA"
            className="shrink-0"
            top={<span className={cn("numeric", off && "text-fg-disabled")}>{formatWon(sub.amount)}</span>}
            bottom={<span className={cn("numeric", billingColor)}>{billingLabel}</span>}
          />
        </div>
      }
      right={
        <Switch
          aria-label={sub.isActive ? "일시정지" : "활성화"}
          checked={sub.isActive}
          disabled={isPendingToggle}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onCheckedChange={handleToggle}
        />
      }
    />
  );
}
