import { prisma } from "@/lib/prisma";
import { getKstWideFetchRangeUtc } from "@/lib/kst-month-range";
import { computeMonthSalarySummary } from "@/lib/work-salary-summary";
import { ensureDefaultWorkUserId } from "@/lib/work-default-user";
import type { WorkRecord } from "@/generated/prisma";

export type DashboardWorkNetResult = {
  netPay: number;
  activeWorkplaces: number;
  year: number;
  month: number;
};

/**
 * KST 달력 기준 해당 월의 알바 예상 실수령액(활성 근무지별 집계 합).
 * 급여 화면과 동일하게 주휴·세금은 주 단위로 산출 후 월에 배분합니다.
 */
export async function getDashboardWorkNetForKstMonth(
  year: number,
  month: number
): Promise<DashboardWorkNetResult> {
  const userId = await ensureDefaultWorkUserId();
  const workplaces = await prisma.workplace.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  if (workplaces.length === 0) {
    return { netPay: 0, activeWorkplaces: 0, year, month };
  }

  const { start, end } = getKstWideFetchRangeUtc(year, month);
  const ids = workplaces.map((w) => w.id);

  const allRecords = await prisma.workRecord.findMany({
    where: {
      workplaceId: { in: ids },
      date: { gte: start, lte: end },
    },
  });

  const byWorkplace = new Map<string, WorkRecord[]>();
  for (const r of allRecords) {
    const arr = byWorkplace.get(r.workplaceId) ?? [];
    arr.push(r);
    byWorkplace.set(r.workplaceId, arr);
  }

  let netPay = 0;
  for (const w of workplaces) {
    const recs = byWorkplace.get(w.id) ?? [];
    netPay += computeMonthSalarySummary(recs, year, month).netPay;
  }

  return {
    netPay,
    activeWorkplaces: workplaces.length,
    year,
    month,
  };
}
