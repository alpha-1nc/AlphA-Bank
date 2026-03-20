"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { toggleCashFlow } from "@/app/actions/budget";
import { cn } from "@/lib/utils";

export interface PendingActionItem {
  id: string;
  type: string;
  title: string;
  amount: number;
  isCompleted: boolean;
  accountId: string | null;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

const typeColor: Record<string, string> = {
  INCOME: "text-blue-600 dark:text-blue-400",
  EXPENSE_FIXED: "text-red-400 dark:text-red-300",
  EXPENSE_VAR: "text-orange-400 dark:text-orange-300",
  SAVING: "text-emerald-500 dark:text-emerald-400",
};

const typeTag: Record<string, string> = {
  INCOME: "수입",
  EXPENSE_FIXED: "고정지출",
  EXPENSE_VAR: "변동지출",
  SAVING: "저축",
};

interface PendingActionsChecklistProps {
  items: PendingActionItem[];
}

export function PendingActionsChecklist({ items }: PendingActionsChecklistProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(item: PendingActionItem) {
    startTransition(async () => {
      await toggleCashFlow(
        item.id,
        item.isCompleted,
        item.accountId,
        item.amount,
        item.type
      );
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-3" />
        <p className="text-sm font-semibold text-slate-500">모든 항목 완료!</p>
        <p className="text-xs text-slate-400 mt-1">이번 달 미결제 항목이 없습니다</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2.5 flex-1 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors",
              isPending && "opacity-70"
            )}
          >
            <Checkbox
              checked={item.isCompleted}
              onCheckedChange={() => handleToggle(item)}
              aria-label={`집행 완료: ${item.title}`}
              className="rounded border-slate-300 shrink-0 data-[state=checked]:bg-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {item.title}
              </p>
              <p className={cn("text-xs font-medium", typeColor[item.type] ?? "text-slate-400")}>
                {typeTag[item.type] ?? item.type}
              </p>
            </div>
            <span className="text-sm font-black tracking-tighter text-slate-700 dark:text-slate-300 shrink-0">
              {formatKRW(item.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          총 {items.length}건 미결제
        </span>
        <span className="text-sm font-black tracking-tighter text-red-400">
          {formatKRW(items.reduce((s, c) => s + c.amount, 0))}
        </span>
      </div>
    </>
  );
}
