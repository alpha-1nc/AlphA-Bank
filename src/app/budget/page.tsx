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
import { BudgetHeader } from "./BudgetHeader";

export const dynamic = "force-dynamic";

/** 예산 통제 기간 표시 (시작일 ~ 종료일) */
function formatPeriodLabel(start: Date, end: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const md = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  if (start.getFullYear() === end.getFullYear()) return `${md(start)} ~ ${md(end)}`;
  const ymd = (d: Date) => `${d.getFullYear()}.${md(d)}`;
  return `${ymd(start)} ~ ${ymd(end)}`;
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
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      <BudgetHeader month={month} periodLabel={periodLabel} />

      <BudgetSummary
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        totalSaving={totalSaving}
        livingBalance={livingBalance}
      />

      <ImportPreviousMonthButton currentMonth={month} />

      <CashFlowBoard monthlyBudgetId={budget.id} transactions={budget.transactions} />
    </div>
  );
}
