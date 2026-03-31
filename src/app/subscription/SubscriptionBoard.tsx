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
import { CATEGORY_COLORS, SUBSCRIPTION_CATEGORIES, type SubscriptionCategory } from "@/lib/subscription-constants";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  isActive: boolean;
  accountId: string | null;
  memo: string | null;
}

interface Props {
  subscriptions: Subscription[];
  accounts: Account[];
  currentBudgetMonth: string;
  totalMonthly: number;
}

function formatKRW(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

function getBillingDayLabel(day: number): string {
  const today = new Date().getDate();
  const diff = day - today;
  if (diff === 0) return "오늘 결제";
  if (diff > 0) return `D-${diff}`;
  return `매월 ${day}일`;
}

export default function SubscriptionBoard({ subscriptions, accounts, currentBudgetMonth, totalMonthly }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [reflectedIds, setReflectedIds] = useState<Set<string>>(new Set());
  const [isPendingAll, startAllTransition] = useTransition();
  const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const categories = ["전체", ...SUBSCRIPTION_CATEGORIES];

  const filtered = subscriptions.filter((s) =>
    categoryFilter === "전체" ? true : s.category === categoryFilter
  );

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
            "rounded-2xl border px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300",
            banner.ok
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          )}
        >
          {banner.message}
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-primary/12 via-primary/8 to-primary/5 border border-primary/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">월 총 구독료</p>
          <p className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {formatKRW(totalMonthly)}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            활성 구독 {subscriptions.filter((s) => s.isActive).length}건
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-slate-200 dark:border-white/15 transition-all hover:bg-primary/5 active:scale-[0.98]"
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
                className="gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/90 text-white font-bold shadow-lg shadow-primary/25 hover:opacity-95 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                새 구독 추가
              </Button>
            }
            accounts={accounts}
          />
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2 animate-in fade-in duration-500"
        role="tablist"
        aria-label="구독 카테고리 필터"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={categoryFilter === cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95",
              categoryFilter === cat
                ? "bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]"
                : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/18 hover:scale-[1.02]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-8 py-20 flex flex-col items-center justify-center text-center transition-colors hover:border-primary/25 hover:bg-slate-50/80 dark:hover:bg-white/[0.07] animate-in fade-in zoom-in-95 duration-500">
          <RefreshCw className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4 opacity-80" />
          {subscriptions.length === 0 ? (
            <>
              <p className="text-base font-semibold text-slate-500">등록된 구독이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">새 구독 추가 버튼으로 구독을 등록해보세요</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-500">이 카테고리에 해당하는 구독이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">다른 카테고리를 선택해보세요</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filtered.map((sub) => (
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

          <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 hover:shadow-md">
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
                <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03]">
                  <th scope="col" className="py-3 px-1 w-14">
                    <span className="sr-only">활성</span>
                  </th>
                  <th className="py-3 pl-2 pr-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    서비스
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    결제일
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    금액
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    카테고리
                  </th>
                  <th className="py-3 pl-2 pr-4">
                    <div className="flex justify-end">
                      <div className="flex w-[calc(2.25rem*3+0.25rem)] justify-center">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          액션
                        </span>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
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
          accounts={accounts}
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

  const categoryColor = CATEGORY_COLORS[sub.category as SubscriptionCategory] ?? CATEGORY_COLORS["기타"];
  const billingLabel = getBillingDayLabel(sub.billingDay);

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
        "rounded-2xl border bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 p-4 transition-all duration-200 hover:shadow-md hover:border-primary/15 active:scale-[0.99]",
        !sub.isActive && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <ToggleSubscriptionButton
            isActive={sub.isActive}
            isPending={isPendingToggle}
            onToggle={handleToggle}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{sub.name}</span>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", categoryColor)}>
                  {sub.category}
                </span>
                {!sub.isActive && (
                  <span className="text-xs text-slate-400 font-medium">일시정지</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {billingLabel}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatKRW(sub.amount)}</span>
              </div>
              {sub.memo && <p className="text-xs text-slate-400 mt-1 truncate">{sub.memo}</p>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 self-start">
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
        </div>
      </div>
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

  const categoryColor = CATEGORY_COLORS[sub.category as SubscriptionCategory] ?? CATEGORY_COLORS["기타"];
  const billingLabel = getBillingDayLabel(sub.billingDay);

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
        "border-b border-slate-100 dark:border-white/10 last:border-b-0 transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04]",
        !sub.isActive && "opacity-50"
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
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{sub.name}</span>
            {!sub.isActive && (
              <span className="text-xs text-slate-400 font-medium shrink-0">일시정지</span>
            )}
          </div>
          {sub.memo && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub.memo}</p>}
        </div>
      </td>
      <td className="py-4 px-2 align-middle text-slate-500">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{billingLabel}</span>
        </div>
      </td>
      <td className="py-4 px-2 align-middle font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
        {formatKRW(sub.amount)}
      </td>
      <td className="py-4 px-2 align-middle">
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full truncate", categoryColor)}>
          {sub.category}
        </span>
      </td>
      <td className="py-4 pl-2 pr-4 align-middle text-right">
        <div className="inline-flex items-center justify-end gap-0.5 flex-nowrap">
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
  "h-9 w-9 text-slate-400 hover:text-primary";

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
      className="!size-11 min-h-11 min-w-11 shrink-0 rounded-xl text-slate-500 hover:text-primary"
      title={isActive ? "일시정지" : "활성화"}
      onClick={onToggle}
      disabled={isPending}
    >
      {isActive ? (
        <ToggleRight className="size-6 text-primary" />
      ) : (
        <ToggleLeft className="size-6" />
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
        <RefreshCw className={cn("h-5 w-5", isPendingReflect && "animate-spin", isReflected && "text-emerald-500")} />
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
        className={cn(secondaryActionIconClass, "hover:text-destructive")}
        title="삭제"
        onClick={onDelete}
        disabled={isPendingDelete}
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </>
  );
}
