import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/app/actions/settings";
import { getOrCreateMonthlyBudget } from "@/app/actions/budget";
import { Check, LayoutDashboard } from "lucide-react";
import AssetDonutChart from "@/components/dashboard/AssetDonutChart";
import CashFlowBarChart from "@/components/dashboard/CashFlowBarChart";
import { PendingActionsChecklist } from "@/components/dashboard/PendingActionsChecklist";
import PrimeBucketDashboardCard from "@/components/dashboard/PrimeBucketDashboardCard";
import WorkSalaryDashboardCard from "@/components/dashboard/WorkSalaryDashboardCard";
import { getDashboardWorkNet } from "@/lib/dashboard-work-net";

export const dynamic = "force-dynamic";

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}


function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return months;
}

function monthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return `${parseInt(m)}월`;
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  입출금: "입출금",
  금고: "금고",
  저축: "저축",
  증권: "증권",
  연금: "연금",
};

export default async function DashboardPage() {
  const currentMonth = getCurrentMonth();
  const past6Months = getPast6Months();

  // ── SystemSettings 먼저 조회 → 동적 예산 월 계산 ────────────────────────────
  const systemSettings = await getSystemSettings();
  const startDay = systemSettings?.budgetStartDate ?? 1;
  const today = new Date();
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth() + 1; // 1~12
  if (today.getDate() < startDay) {
    targetMonth -= 1;
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    }
  }
  const currentBudgetMonth = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [accounts, monthlyBudgets, primeBucket, workNet] = await Promise.all([
    // a) All accounts for total net worth + donut chart
    prisma.account.findMany({ select: { type: true, initialBalance: true } }),

    // b) Last 6 months of budgets with cash flows for bar chart
    prisma.monthlyBudget.findMany({
      where: { month: { in: past6Months } },
      include: { transactions: true },
    }),

    // c) Prime bucket: 미완료·미달성 중 중요도 최상위 (완료 시 자동으로 다음 순위)
    prisma.bucketList.findFirst({
      where: { isAchieved: false, isCompleted: false },
      orderBy: [{ importance: "desc" }, { createdAt: "asc" }],
    }),

    // d) KST·근무지 월급일 기준 미지급 근무월 알바 예상 실수령 (활성 근무지 합산)
    getDashboardWorkNet(),
  ]);
  const currentBudget =
    currentBudgetMonth === currentMonth
      ? monthlyBudgets.find((b) => b.month === currentBudgetMonth)
      : await getOrCreateMonthlyBudget(currentBudgetMonth);
  const currentBudgetResolved =
    typeof currentBudget === "object" && "transactions" in currentBudget
      ? currentBudget
      : await getOrCreateMonthlyBudget(currentBudgetMonth);

  // ── a) Total net worth & donut data ────────────────────────────────────────
  const totalNetWorth = accounts.reduce((s, a) => s + a.initialBalance, 0);

  const typeMap: Record<string, number> = {};
  for (const acc of accounts) {
    const label = ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type;
    typeMap[label] = (typeMap[label] ?? 0) + acc.initialBalance;
  }
  const donutData = Object.entries(typeMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // ── b) Monthly cash flow bar chart data ───────────────────────────────────
  const budgetByMonth = Object.fromEntries(
    monthlyBudgets.map((b) => [b.month, b.transactions])
  );

  const barData = past6Months.map((ym) => {
    const txs = budgetByMonth[ym] ?? [];
    const income = txs
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const expense = txs
      .filter((t) => t.type === "EXPENSE_FIXED" || t.type === "EXPENSE_VAR")
      .reduce((s, t) => s + t.amount, 0);
    const saving = txs
      .filter((t) => t.type === "SAVING")
      .reduce((s, t) => s + t.amount, 0);
    return { month: monthLabel(ym), income, expense, saving };
  });

  // ── c) Pending actions (설정 기준일 기준 현재 예산 월, 지출(EXPENSE)만) ─────
  const pendingActions = (currentBudgetResolved?.transactions ?? [])
    .filter((t) => !t.isCompleted)
    .filter(
      (t) => t.type === "EXPENSE_FIXED" || t.type === "EXPENSE_VAR"
    );

  const primeBucketItem = primeBucket
    ? {
        id: primeBucket.id,
        title: primeBucket.title,
        importance: primeBucket.importance,
        targetAmount: primeBucket.targetAmount,
        currentAmount: primeBucket.currentAmount,
        isAchieved: primeBucket.isAchieved,
        isCompleted: primeBucket.isCompleted,
        completedAt: primeBucket.completedAt
          ? primeBucket.completedAt.toISOString().slice(0, 10)
          : null,
        imageUrl: primeBucket.imageUrl,
      }
    : null;

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-hidden">
      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2.5 min-w-0">
              <LayoutDashboard className="h-8 w-8 text-primary shrink-0" />
              <span className="break-words">대시보드</span>
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              자산, 예산, 머니 버킷리스트 종합 현황
            </p>
          </div>
          <p className="text-sm text-slate-400 font-medium shrink-0">
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            기준
          </p>
        </div>
      </header>

      {/* ── Grid Row 1: Charts ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Donut Chart Card */}
        <div
          className="
            bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10
            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
            p-6 flex flex-col
            transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl
          "
        >
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Asset Breakdown
            </p>
            <h2 className="text-lg font-black tracking-tighter text-slate-900 dark:text-slate-100 mt-0.5">
              자산 구성
            </h2>
          </div>

          <AssetDonutChart data={donutData} totalNetWorth={totalNetWorth} />

          {/* Legend */}
          <ul className="mt-4 space-y-2">
            {donutData.map((d, i) => {
              const colors = [
                "#3b82f6",
                "#60a5fa",
                "#93c5fd",
                "#6366f1",
                "#a5b4fc",
                "#94a3b8",
                "#cbd5e1",
              ];
              const pct =
                totalNetWorth > 0
                  ? ((d.value / totalNetWorth) * 100).toFixed(1)
                  : "0";
              return (
                <li key={d.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="text-slate-600 font-medium flex-1">
                    {d.name}
                  </span>
                  <span className="text-slate-400 font-medium">{pct}%</span>
                  <span className="text-slate-800 font-semibold">
                    {formatKRW(d.value)}
                  </span>
                </li>
              );
            })}
            {donutData.length === 0 && (
              <li className="text-sm text-slate-400 text-center py-4">
                등록된 계좌가 없습니다
              </li>
            )}
          </ul>
        </div>

        {/* Bar Chart Card (2 cols) */}
        <div
          className="
            md:col-span-2 bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10
            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
            p-6 flex flex-col
            transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl
          "
        >
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Cash Flow
            </p>
            <h2 className="text-lg font-black tracking-tighter text-slate-900 dark:text-slate-100 mt-0.5">
              월별 수입 · 지출 · 저축
            </h2>
          </div>

          <div className="flex-1">
            <CashFlowBarChart data={barData} />
          </div>

          {/* Summary row - 설정 기준일 기준 현재 예산 월 */}
          {currentBudgetResolved && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 pt-4 border-t border-slate-50 dark:border-white/5">
              {[
                {
                  label: "이번달 수입",
                  value: currentBudgetResolved.transactions
                    .filter((t) => t.type === "INCOME")
                    .reduce((s, t) => s + t.amount, 0),
                  color: "text-blue-600 dark:text-blue-400",
                },
                {
                  label: "이번달 예상 지출",
                  value: currentBudgetResolved.transactions
                    .filter((t) => t.type === "EXPENSE_FIXED" || t.type === "EXPENSE_VAR")
                    .reduce((s, t) => s + t.amount, 0),
                  color: "text-red-400",
                },
                {
                  label: "이번달 저축",
                  value: currentBudgetResolved.transactions
                    .filter((t) => t.type === "SAVING")
                    .reduce((s, t) => s + t.amount, 0),
                  color: "text-emerald-500",
                },
              ].map((item) => (
                <div key={item.label} className="text-center min-w-0 overflow-hidden">
                  <p className="text-xs text-slate-400 font-medium truncate">
                    {item.label}
                  </p>
                  <p
                    className={`text-xs sm:text-base font-black tracking-tighter ${item.color} mt-0.5 truncate`}
                  >
                    {formatKRW(item.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid Row 2: 알바 실수령 · Actions & Bucket ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <WorkSalaryDashboardCard
          netPay={workNet.netPay}
          activeWorkplaces={workNet.activeWorkplaces}
          monthLabel={workNet.monthLabel}
        />

        {/* Action Checklist Card */}
        <div
          className="
            bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10
            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
            p-6 flex flex-col min-h-[200px]
            transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl
          "
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">
                Pending Actions
              </p>
              <h2 className="text-lg font-black tracking-tighter text-slate-900 dark:text-slate-100 mt-0.5 leading-none">
                미결제 체크리스트
              </h2>
            </div>
            <Check
              className="h-8 w-8 text-primary shrink-0 opacity-90 stroke-[2.5]"
              aria-hidden
            />
          </div>

          <PendingActionsChecklist
            items={pendingActions.map((t) => ({
              id: t.id,
              type: t.type,
              title: t.title,
              amount: t.amount,
              isCompleted: t.isCompleted,
              accountId: t.accountId,
            }))}
          />
        </div>

        <PrimeBucketDashboardCard bucket={primeBucketItem} />
      </div>
    </div>
  );
}
