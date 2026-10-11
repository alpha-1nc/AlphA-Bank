"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight, CalendarDays } from "lucide-react";
import AddSubscriptionDialog from "./AddSubscriptionDialog";
import EditSubscriptionDialog from "./EditSubscriptionDialog";
import {
  deleteSubscription,
  toggleSubscriptionActive,
  addSubscriptionToBudget,
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

/** 카테고리 뱃지: 무채색 pill (/budget 카테고리 뱃지와 동일) */
function CategoryPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("t8 inline-flex max-w-full shrink-0 items-center truncate rounded-pill bg-divider px-2 py-0.5 font-medium text-fg-secondary", className)}>
      {children}
    </span>
  );
}

function getBillingDayLabel(day: number): string {
  const today = new Date().getDate();
  const diff = day - today;
  if (diff === 0) return "오늘 결제";
  if (diff > 0) return `D-${diff}`;
  return `매월 ${day}일`;
}

export default function SubscriptionBoard({ subscriptions, currentBudgetMonth, totalMonthly }: Props) {
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [reflectedIds, setReflectedIds] = useState<Set<string>>(new Set());
  const [isPendingAll, startAllTransition] = useTransition();
  const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);


  function handleAddAllToBudget() {
    startAllTransition(async () => {
      const result = await addAllSubscriptionsToBudget(currentBudgetMonth);
      if (result.added > 0) {
        setBanner({
          ok: true,
          message: `${result.added}개 구독이 예산에 반영되었습니다.${result.skipped > 0 ? ` (${result.skipped}개는 이미 반영됨)` : ""}`,
        });
      } else {
        setBanner({
          ok: false,
          message: "반영할 구독이 없습니다. (이미 모두 반영되어 있거나 활성 구독이 없습니다)",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {banner && (
        <div
          role="status"
          className={cn(
            "t6 rounded-control px-4 py-3 font-medium animate-in fade-in slide-in-from-top-2 duration-300",
            banner.ok ? "bg-accent-soft text-primary" : "bg-divider text-fg-secondary"
          )}
        >
          {banner.message}
        </div>
      )}

      <div className="rounded-card bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="min-w-0">
          <p className="t7 text-fg-tertiary">월 총 구독료</p>
          <p className="t2 sm:t1 numeric mt-1 font-bold text-foreground">
            {formatWon(totalMonthly)}
          </p>
          <p className="t7 numeric mt-1 text-fg-tertiary">
            활성 구독 {subscriptions.filter((s) => s.isActive).length}건
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="t7 gap-1 rounded-control border-0 bg-divider font-semibold text-foreground hover:bg-divider active:scale-[0.98]"
            onClick={handleAddAllToBudget}
            disabled={isPendingAll}
          >
            <RefreshCw className={cn("h-4 w-4", isPendingAll && "animate-spin")} />
            {isPendingAll ? "반영 중..." : "전체 예산 반영"}
          </Button>
          <AddSubscriptionDialog
            trigger={
              <Button
                size="sm"
                className="t7 gap-1 rounded-control bg-primary font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4" />
                새 구독 추가
              </Button>
            }
          />
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-card bg-card px-7 py-7 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
          <RefreshCw className="h-12 w-12 text-fg-disabled mb-4" />
          <p className="t6 font-semibold text-fg-secondary">등록된 구독이 없습니다</p>
          <p className="t7 text-fg-tertiary mt-1">새 구독 추가 버튼으로 구독을 등록해보세요</p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {subscriptions.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                subscription={sub}
                currentBudgetMonth={currentBudgetMonth}
                isReflected={reflectedIds.has(sub.id)}
                onReflected={() => setReflectedIds((prev) => new Set(prev).add(sub.id))}
                onEdit={() => setEditTarget(sub)}
                onBanner={setBanner}
              />
            ))}
          </div>

          <div className="hidden md:block rounded-card bg-card overflow-hidden">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-14 min-w-[3.5rem]" />
                <col style={{ width: "32%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-divider">
                  <th scope="col" className="py-3 px-1 w-14">
                    <span className="sr-only">활성</span>
                  </th>
                  <th className="py-3 pl-2 pr-2 text-left t7 font-medium text-fg-tertiary">
                    서비스
                  </th>
                  <th className="py-3 px-2 text-left t7 font-medium text-fg-tertiary">
                    결제일
                  </th>
                  <th className="py-3 px-2 text-left t7 font-medium text-fg-tertiary">
                    금액
                  </th>
                  <th className="py-3 px-2 text-left t7 font-medium text-fg-tertiary">
                    카테고리
                  </th>
                  <th className="py-3 pl-2 pr-4">
                    <div className="flex justify-end">
                      <div className="flex w-[calc(2.25rem*3+0.25rem)] justify-center">
                        <span className="t7 font-medium text-fg-tertiary">
                          작업
                        </span>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <SubscriptionTableRow
                    key={sub.id}
                    subscription={sub}
                    currentBudgetMonth={currentBudgetMonth}
                    isReflected={reflectedIds.has(sub.id)}
                    onReflected={() => setReflectedIds((prev) => new Set(prev).add(sub.id))}
                    onEdit={() => setEditTarget(sub)}
                    onBanner={setBanner}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editTarget && (
        <EditSubscriptionDialog
          subscription={editTarget}
          open={editTarget !== null}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        />
      )}
    </div>
  );
}

interface RowProps {
  subscription: Subscription;
  currentBudgetMonth: string;
  isReflected: boolean;
  onReflected: () => void;
  onEdit: () => void;
  onBanner: (payload: { ok: boolean; message: string }) => void;
}

/** 모바일 전용 카드 행 */
function SubscriptionRow({
  subscription: sub,
  currentBudgetMonth,
  isReflected,
  onReflected,
  onEdit,
  onBanner,
}: RowProps) {
  const [isPendingToggle, startToggle] = useTransition();
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingReflect, startReflect] = useTransition();

  const billingLabel = getBillingDayLabel(sub.billingDay);
  // 일시정지 행은 전체를 fg-disabled로 흐리게
  const off = !sub.isActive;
  const billingColor = off
    ? "text-fg-disabled"
    : isBillingImminent(sub.billingDay)
      ? "text-primary"
      : "text-fg-tertiary";

  function handleToggle() {
    startToggle(async () => {
      await toggleSubscriptionActive(sub.id);
    });
  }

  function handleDelete() {
    if (!confirm(`"${sub.name}" 구독을 삭제할까요?`)) return;
    startDelete(async () => {
      await deleteSubscription(sub.id);
    });
  }

  function handleReflect() {
    startReflect(async () => {
      const result = await addSubscriptionToBudget(sub.id, currentBudgetMonth);
      if (result.alreadyExists) {
        onBanner({
          ok: false,
          message: `"${sub.name}"은 이미 이번 달 예산에 반영되어 있습니다.`,
        });
      } else if (result.success) {
        onReflected();
        onBanner({
          ok: true,
          message: `"${sub.name}"을(를) 이번 달 예산에 반영했습니다.`,
        });
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-card bg-card p-5 transition-all duration-200 active:scale-[0.99]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <ToggleSubscriptionButton
            isActive={sub.isActive}
            isPending={isPendingToggle}
            onToggle={handleToggle}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("t6 min-w-0 truncate font-bold", off ? "text-fg-disabled" : "text-foreground")}>
                {sub.name}
              </span>
              <CategoryPill className={cn("max-w-[45%]", off && "text-fg-disabled")}>{sub.category}</CategoryPill>
            </div>
            {!sub.isActive && (
              <span className="t7 mt-1 inline-block font-medium text-fg-disabled">일시정지</span>
            )}
          </div>
        </div>
      </div>

      <p className={cn("t3 numeric mt-3 font-bold", off ? "text-fg-disabled" : "text-foreground")}>
        {formatWon(sub.amount)}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-divider pt-3">
        <span className={cn("t7 numeric flex min-w-0 items-center gap-1", billingColor)}>
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{billingLabel}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <SecondarySubscriptionActions
            isReflected={isReflected}
            isPendingDelete={isPendingDelete}
            isPendingReflect={isPendingReflect}
            onDelete={handleDelete}
            onReflect={handleReflect}
            onEdit={onEdit}
          />
        </div>
      </div>

      {sub.memo && <p className={cn("t7 mt-2 truncate", off ? "text-fg-disabled" : "text-fg-tertiary")}>{sub.memo}</p>}
    </div>
  );
}

/** 데스크톱: thead와 동일 열을 쓰는 table 행 */
function SubscriptionTableRow({
  subscription: sub,
  currentBudgetMonth,
  isReflected,
  onReflected,
  onEdit,
  onBanner,
}: RowProps) {
  const [isPendingToggle, startToggle] = useTransition();
  const [isPendingDelete, startDelete] = useTransition();
  const [isPendingReflect, startReflect] = useTransition();

  const billingLabel = getBillingDayLabel(sub.billingDay);
  // 일시정지 행은 전체를 fg-disabled로 흐리게
  const off = !sub.isActive;
  const billingColor = off
    ? "text-fg-disabled"
    : isBillingImminent(sub.billingDay)
      ? "text-primary"
      : "text-fg-tertiary";

  function handleToggle() {
    startToggle(async () => {
      await toggleSubscriptionActive(sub.id);
    });
  }

  function handleDelete() {
    if (!confirm(`"${sub.name}" 구독을 삭제할까요?`)) return;
    startDelete(async () => {
      await deleteSubscription(sub.id);
    });
  }

  function handleReflect() {
    startReflect(async () => {
      const result = await addSubscriptionToBudget(sub.id, currentBudgetMonth);
      if (result.alreadyExists) {
        onBanner({
          ok: false,
          message: `"${sub.name}"은 이미 이번 달 예산에 반영되어 있습니다.`,
        });
      } else if (result.success) {
        onReflected();
        onBanner({
          ok: true,
          message: `"${sub.name}"을(를) 이번 달 예산에 반영했습니다.`,
        });
      }
    });
  }

  return (
    <tr
      className={cn(
        "border-b border-divider last:border-b-0 transition-colors hover:bg-background"
      )}
    >
      <td className="py-4 pl-3 pr-1 align-middle w-14">
        <div className="flex justify-center">
          <ToggleSubscriptionButton
            isActive={sub.isActive}
            isPending={isPendingToggle}
            onToggle={handleToggle}
          />
        </div>
      </td>
      <td className="py-4 pl-2 pr-2 align-middle min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("t6 font-bold truncate", off ? "text-fg-disabled" : "text-foreground")}>{sub.name}</span>
            {!sub.isActive && (
              <span className="t7 font-medium shrink-0 text-fg-disabled">일시정지</span>
            )}
          </div>
          {sub.memo && <p className={cn("t7 mt-1 truncate", off ? "text-fg-disabled" : "text-fg-tertiary")}>{sub.memo}</p>}
        </div>
      </td>
      <td className={cn("t7 numeric py-4 px-2 align-middle", billingColor)}>
        <div className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{billingLabel}</span>
        </div>
      </td>
      <td className={cn("t6 numeric py-4 px-2 align-middle font-semibold whitespace-nowrap", off ? "text-fg-disabled" : "text-foreground")}>
        {formatWon(sub.amount)}
      </td>
      <td className="py-4 px-2 align-middle">
        <CategoryPill className={cn(off && "text-fg-disabled")}>{sub.category}</CategoryPill>
      </td>
      <td className="py-4 pl-2 pr-4 align-middle text-right">
        <div className="inline-flex items-center justify-end gap-1 flex-nowrap">
          <SecondarySubscriptionActions
            isReflected={isReflected}
            isPendingDelete={isPendingDelete}
            isPendingReflect={isPendingReflect}
            onDelete={handleDelete}
            onReflect={handleReflect}
            onEdit={onEdit}
          />
        </div>
      </td>
    </tr>
  );
}

const secondaryActionIconClass =
  "h-11 w-11 rounded-pill text-fg-tertiary hover:bg-accent-soft hover:text-primary";

function ToggleSubscriptionButton({
  isActive,
  isPending,
  onToggle,
}: {
  isActive: boolean;
  isPending: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="!size-11 min-h-11 min-w-11 shrink-0 rounded-pill text-fg-disabled hover:bg-transparent"
      title={isActive ? "일시정지" : "활성화"}
      onClick={onToggle}
      disabled={isPending}
    >
      {isActive ? (
        <ToggleRight className="size-6 text-primary" />
      ) : (
        <ToggleLeft className="size-6 text-fg-disabled" />
      )}
    </Button>
  );
}

interface SecondarySubscriptionActionsProps {
  isReflected: boolean;
  isPendingDelete: boolean;
  isPendingReflect: boolean;
  onDelete: () => void;
  onReflect: () => void;
  onEdit: () => void;
}

function SecondarySubscriptionActions({
  isReflected,
  isPendingDelete,
  isPendingReflect,
  onDelete,
  onReflect,
  onEdit,
}: SecondarySubscriptionActionsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={secondaryActionIconClass}
        title="예산 반영"
        onClick={onReflect}
        disabled={isPendingReflect || isReflected}
      >
        <RefreshCw className={cn("h-5 w-5", isPendingReflect && "animate-spin", isReflected && "text-positive")} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={secondaryActionIconClass}
        title="수정"
        onClick={onEdit}
      >
        <Pencil className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(secondaryActionIconClass, "hover:bg-divider hover:text-negative")}
        title="삭제"
        onClick={onDelete}
        disabled={isPendingDelete}
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </>
  );
}
