import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getSystemSettings } from "@/app/actions/settings";
import { getOrCreateMonthlyBudget } from "@/app/actions/budget";
import CashFlowBarChart, { CashFlowLegend } from "@/components/dashboard/CashFlowBarChart";
import PaydayHero from "@/components/dashboard/PaydayHero";
import MonthSummary from "@/components/dashboard/MonthSummary";
import { Button } from "@/components/ui";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { getDashboardWorkNet } from "@/lib/dashboard-work-net";
import { getCurrentBudgetMonth } from "@/lib/budget-utils";
import { computeBudgetTotals } from "@/lib/budget-totals";
import { isExpenseType } from "@/lib/cashflow-categories";
import { formatKstDateKey } from "@/lib/kst-date-key";
import { getNextPayday } from "@/lib/payday";
import { getUserProfile } from "@/lib/user-profiles";
import { getBudgetPeriodRange } from "@/lib/budget-period";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

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

/** 예산 기간 라벨 (/budget과 같은 getBudgetPeriodRange 사용): "10월 10일 ~ 11월 9일" */
function budgetPeriodLabel(month: string, budgetStartDate: number): string {
  const { start, end } = getBudgetPeriodRange(month, budgetStartDate);
  const f = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${f(start)} ~ ${f(end)}`;
}

/** KST 날짜 키 → { month, day, weekday } */
function kstParts(date: Date) {
  const [y, m, d] = formatKstDateKey(date).split("-").map(Number);
  return { month: m, day: d, weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const past6Months = getPast6Months();

  // ── 설정 기준일 기준 현재 예산 월 (/budget 기본 월과 동일) ───────────────────
  const systemSettings = await getSystemSettings();
  const currentBudgetMonth = getCurrentBudgetMonth(systemSettings.budgetStartDate);

  const [monthlyBudgets, workNet, currentBudget] = await Promise.all([
    // 최근 6개월 예산 (막대그래프)
    prisma.monthlyBudget.findMany({
      where: { userId, month: { in: past6Months } },
      include: { transactions: true },
    }),
    getDashboardWorkNet(userId),
    getOrCreateMonthlyBudget(currentBudgetMonth, userId),
  ]);

  // ── 헤더 ────────────────────────────────────────────────────────────────────
  const displayName = getUserProfile(userId)?.displayName ?? "";
  const budgetMonthNumber = Number(currentBudgetMonth.split("-")[1]);
  const today = kstParts(new Date());

  // ── 월급 카드: 가장 가까운 지급일 ───────────────────────────────────────────
  const nextPaydays = workNet.workplaces.map((w) => ({
    workplace: w,
    ...getNextPayday(w.paydayOfMonth),
  }));
  const nearest = nextPaydays.reduce<(typeof nextPaydays)[number] | null>(
    (best, cur) => (best === null || cur.daysUntil < best.daysUntil ? cur : best),
    null
  );

  let payday: {
    month: number;
    day: number;
    weekday: string;
    daysUntil: number;
    originalLabel: string | null;
  } | null = null;
  if (nearest) {
    const p = kstParts(nearest.date);
    const o = kstParts(nearest.originalDate);
    payday = {
      ...p,
      daysUntil: nearest.daysUntil,
      originalLabel:
        o.month === p.month && o.day === p.day
          ? null
          : o.month === p.month
            ? `${o.day}일`
            : `${o.month}월 ${o.day}일`,
    };
  }
  const workplaceLabel = nearest
    ? workNet.workplaces.length > 1
      ? `${nearest.workplace.name} 외 ${workNet.workplaces.length - 1}곳`
      : nearest.workplace.name
    : "";

  // ── 이번 달 예산 (/budget과 같은 공용 계산) ─────────────────────────────────
  const totals = computeBudgetTotals(currentBudget.transactions);

  // ── 최근 6개월 막대그래프 데이터 ────────────────────────────────────────────
  const budgetByMonth = Object.fromEntries(
    monthlyBudgets.map((b) => [b.month, b.transactions])
  );

  const barData = past6Months.map((ym) => {
    const txs = budgetByMonth[ym] ?? [];
    const income = txs
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const expense = txs
      .filter((t) => isExpenseType(t.type))
      .reduce((s, t) => s + t.amount, 0);
    const saving = txs
      .filter((t) => t.type === "SAVING")
      .reduce((s, t) => s + t.amount, 0);
    return { month: monthLabel(ym), income, expense, saving };
  });

  return (
    <div className="px-4 py-6 md:p-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      <div className="flex w-full flex-col gap-3">
        {/* 1) 헤더 (md 이상) */}
        <DashboardHeader
          title={`${displayName ? `${displayName}님의 ` : ""}${budgetMonthNumber}월`}
          asOfLabel={`${today.month}월 ${today.day}일 기준`}
        />

        {/* 2) 월급 카드 + 이번 달 예산 카드 */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 shrink-0">
          {/* 근무지가 없으면(퇴사 후 등) 월급 카드 숨김 → 예산 카드가 전체 폭 */}
          {payday && (
            <div className="lg:w-[450px] lg:shrink-0 lg:[&>*]:h-full">
              <PaydayHero
                payday={payday}
                netPay={workNet.netPay}
                workHours={Math.round((workNet.totalWorkMinutes / 60) * 10) / 10}
                workplaceLabel={workplaceLabel}
                noRecords={workNet.recordCount === 0 && workNet.netPay === 0}
              />
            </div>
          )}
          <div className="flex-1 min-w-0 lg:[&>*]:h-full">
            <MonthSummary
              totalIncome={totals.totalIncome}
              totalExpense={totals.totalExpense}
              totalSaving={totals.totalSaving}
              livingBalance={totals.livingBalance}
              savingRate={totals.savingRate}
              periodLabel={budgetPeriodLabel(currentBudgetMonth, systemSettings.budgetStartDate)}
            />
          </div>
        </div>

        {/* 3) 최근 6개월 */}
        <div className="flex flex-col rounded-card bg-card p-6 shrink-0">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <p className="t5 font-bold text-foreground">최근 6개월</p>
            <CashFlowLegend />
          </div>
          <div className="w-full min-w-0">
            <CashFlowBarChart data={barData} />
          </div>
        </div>

        {/* 4) 예산 짜러 가기 */}
        <Button as="a" href="/budget" color="primary" variant="fill" size="xlarge" display="block">
          이번 달 예산 짜러 가기
        </Button>
      </div>
    </div>
  );
}
