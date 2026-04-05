import { prisma } from "@/lib/prisma";
import { getKstMonthRangeUtc } from "@/lib/kst-month-range";
import { getKstCalendarYearMonth } from "@/lib/kst-date-key";
import { computeMonthSalarySummary } from "@/lib/work-salary-summary";
import { computeFulltimeMonthSalarySummary } from "@/lib/fulltime-salary-summary";
import { isFulltimeWorkplace } from "@/lib/workplace-type";
import { earliestUnpaidWorkMonth } from "@/lib/work-pay-schedule";
import { WORKPLACE_DEFAULTS } from "@/lib/workplace-client";
import type { WorkRecord } from "@/generated/prisma";

export type DashboardWorkNetResult = {
  netPay: number;
  activeWorkplaces: number;
  /** 카드에 표시하는 근무월 라벨 (근무지마다 월이 다를 수 있음) */
  monthLabel: string;
};

function formatDashboardWorkMonthLabel(
  segments: { year: number; month: number }[]
): string {
  if (segments.length === 0) return "";
  const sorted = [...segments].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
  const uniqMap = new Map<string, { year: number; month: number }>();
  for (const s of sorted) {
    uniqMap.set(`${s.year}-${s.month}`, s);
  }
  const uniq = Array.from(uniqMap.values());
  if (uniq.length === 1) {
    return `${uniq[0].year}년 ${uniq[0].month}월`;
  }
  const sameYear = uniq.every((u) => u.year === uniq[0].year);
  if (sameYear) {
    return `${uniq[0].year}년 ${uniq.map((u) => u.month).join("·")}월`;
  }
  return uniq.map((u) => `${u.year}년 ${u.month}월`).join("·");
}

/**
 * 활성 근무지별로 '아직 받지 않은 가장 이른 근무월' 실수령을 합산 (KST·월급일 반영).
 */
export async function getDashboardWorkNet(userId: string): Promise<DashboardWorkNetResult> {
  const workplaces = await prisma.workplace.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      paydayOfMonth: true,
      type: true,
      monthlyBaseSalary: true,
      allowances: true,
      taxDependents: true,
    },
  });

  const kst = getKstCalendarYearMonth();
  const fallbackLabel = `${kst.year}년 ${kst.month}월`;

  if (workplaces.length === 0) {
    return { netPay: 0, activeWorkplaces: 0, monthLabel: fallbackLabel };
  }

  const perWpMonth = workplaces.map((w) => ({
    id: w.id,
    ...earliestUnpaidWorkMonth(
      w.paydayOfMonth ?? WORKPLACE_DEFAULTS.paydayOfMonth
    ),
  }));

  let minY = perWpMonth[0].year;
  let minM = perWpMonth[0].month;
  let maxY = perWpMonth[0].year;
  let maxM = perWpMonth[0].month;
  for (const row of perWpMonth) {
    if (row.year < minY || (row.year === minY && row.month < minM)) {
      minY = row.year;
      minM = row.month;
    }
    if (row.year > maxY || (row.year === maxY && row.month > maxM)) {
      maxY = row.year;
      maxM = row.month;
    }
  }

  const { startInclusive } = getKstMonthRangeUtc(minY, minM);
  const { endInclusive } = getKstMonthRangeUtc(maxY, maxM);
  const ids = workplaces.map((w) => w.id);

  const allRecords = await prisma.workRecord.findMany({
    where: {
      workplaceId: { in: ids },
      date: { gte: startInclusive, lte: endInclusive },
    },
  });

  const byWorkplace = new Map<string, WorkRecord[]>();
  for (const r of allRecords) {
    const arr = byWorkplace.get(r.workplaceId) ?? [];
    arr.push(r);
    byWorkplace.set(r.workplaceId, arr);
  }

  let netPay = 0;
  for (const row of perWpMonth) {
    const recs = byWorkplace.get(row.id) ?? [];
    const wp = workplaces.find((w) => w.id === row.id);
    if (wp && isFulltimeWorkplace(wp)) {
      netPay += computeFulltimeMonthSalarySummary(recs, wp, row.year, row.month)
        .netPay;
    } else {
      netPay += computeMonthSalarySummary(recs, row.year, row.month).netPay;
    }
  }

  return {
    netPay,
    activeWorkplaces: workplaces.length,
    monthLabel: formatDashboardWorkMonthLabel(
      perWpMonth.map(({ year, month }) => ({ year, month }))
    ),
  };
}
