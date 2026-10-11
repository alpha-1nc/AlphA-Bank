import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateMonthlyBudget } from "@/app/actions/budget";
import { getSystemSettings } from "@/app/actions/settings";
import { getCurrentBudgetMonth } from "@/lib/budget-utils";
import { computeBudgetTotals } from "@/lib/budget-totals";
import { getBudgetPeriodRange } from "@/lib/budget-period";
import { BudgetSummary } from "./BudgetSummary";
import { CashFlowBoard } from "./CashFlowBoard";
import { ImportPreviousMonthButton } from "./ImportPreviousMonthButton";
import { MonthNav } from "./MonthNav";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

/** 예산 통제 기간 표시 (시작일 ~ 종료일) */
function formatPeriodLabel(start: Date, end: Date): string {
  const f = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  };
  return `${f(start)} ~ ${f(end)}`;
}

function isValidMonth(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: { month?: string | string[] };
}) {
  const userId = await getCurrentUserId();
  const systemSettings = await getSystemSettings();
  const defaultMonth = getCurrentBudgetMonth(systemSettings.budgetStartDate);
  const raw = searchParams?.month;
  const rawMonth = (typeof raw === "string" ? raw : raw?.[0]) ?? defaultMonth;
  const month = isValidMonth(rawMonth) ? rawMonth : defaultMonth;

  const budget = await getOrCreateMonthlyBudget(month, userId);

  const { start, end } = getBudgetPeriodRange(month, systemSettings.budgetStartDate);
  const periodLabel = formatPeriodLabel(start, end);

  const { totalIncome, totalExpense, totalSaving, livingBalance } = computeBudgetTotals(budget.transactions);

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t3 hidden md:flex font-bold text-foreground mb-1 items-center gap-2 min-w-0">
            <Wallet className="h-6 w-6 text-primary shrink-0" />
            <span className="break-words">월별 예산</span>
          </h1>
          <p className="t7 hidden md:block text-fg-tertiary">
            월간 예산 수립, 집행 추적
          </p>
        </div>
      </header>

      <MonthNav currentMonth={month} />

      <p className="t7 md:hidden text-fg-tertiary break-words">
        통제 기간 {periodLabel}
      </p>
      <p className="t7 hidden md:block text-fg-tertiary">
        예산 통제 기간: {periodLabel}
      </p>

      <BudgetSummary
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        totalSaving={totalSaving}
        livingBalance={livingBalance}
      />

      <div className="flex justify-end">
        <ImportPreviousMonthButton currentMonth={month} />
      </div>

      <section className="rounded-card bg-card p-4 md:p-7 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="t5 font-bold text-foreground">
            새 내역 추가
          </h2>
        </div>
        <CashFlowBoard
          monthlyBudgetId={budget.id}
          transactions={budget.transactions}
        />
      </section>
    </div>
  );
}
