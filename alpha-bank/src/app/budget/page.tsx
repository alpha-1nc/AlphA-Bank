import { prisma } from "@/lib/prisma";
import { getOrCreateMonthlyBudget } from "@/app/actions/budget";
import { getSystemSettings } from "@/app/actions/settings";
import { getCurrentBudgetMonth } from "@/lib/budget-utils";
import { BudgetSummary } from "./BudgetSummary";
import { CashFlowBoard } from "./CashFlowBoard";
import { MonthNav } from "./MonthNav";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

/** 예산 기준일과 선택 월로 실제 예산 통제 기간 계산 (시작일 ~ 종료일) */
function getBudgetPeriodRange(month: string, budgetStartDate: number): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const year = y;
  const monthIndex = m - 1; // 0-based for Date

  if (budgetStartDate === 1) {
    return {
      start: new Date(year, monthIndex, 1),
      end: new Date(year, monthIndex + 1, 0),
    };
  }
  // 기준일 25 → 2/25 ~ 3/24
  return {
    start: new Date(year, monthIndex - 1, budgetStartDate),
    end: new Date(year, monthIndex, budgetStartDate - 1),
  };
}

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
  const systemSettings = await getSystemSettings();
  const defaultMonth = getCurrentBudgetMonth(systemSettings.budgetStartDate);
  const raw = searchParams?.month;
  const rawMonth = (typeof raw === "string" ? raw : raw?.[0]) ?? defaultMonth;
  const month = isValidMonth(rawMonth) ? rawMonth : defaultMonth;

  const [budget, accounts] = await Promise.all([
    getOrCreateMonthlyBudget(month),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
  ]);

  const { start, end } = getBudgetPeriodRange(month, systemSettings.budgetStartDate);
  const periodLabel = formatPeriodLabel(start, end);

  const totalIncome = budget.transactions
    .filter((c) => c.type === "INCOME")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalFixed = budget.transactions
    .filter((c) => c.type === "EXPENSE_FIXED")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalVar = budget.transactions
    .filter((c) => c.type === "EXPENSE_VAR")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalExpense = totalFixed + totalVar;
  const totalSaving = budget.transactions
    .filter((c) => c.type === "SAVING")
    .reduce((sum, c) => sum + c.amount, 0);
  const livingBalance = totalIncome - totalExpense - totalSaving;

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2.5 min-w-0">
            <Wallet className="h-8 w-8 text-primary shrink-0" />
            <span className="break-words">월별 예산</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            월간 예산 수립, 집행 추적, 개인 용돈 관리
          </p>
        </div>
      </header>

      <MonthNav currentMonth={month} />

      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 mb-2">
        예산 통제 기간: {periodLabel}
      </p>

      <BudgetSummary
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        totalSaving={totalSaving}
        livingBalance={livingBalance}
        personalAllowance={budget.personalAllowance}
        budgetId={budget.id}
      />

      <section className="bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            새 내역 추가
          </h2>
        </div>
        <CashFlowBoard
          monthlyBudgetId={budget.id}
          transactions={budget.transactions}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
          currentMonth={month}
        />
      </section>
    </div>
  );
}
