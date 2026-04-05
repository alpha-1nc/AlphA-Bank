import { revalidatePath } from "next/cache";
import type { WorkRecord } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { formatKstDateKey } from "@/lib/kst-date-key";
import {
  getKstMondayKeyFromDateKey,
  getKstSundayKeyFromMondayKey,
  monthKeyFromDateKey,
} from "@/lib/kst-week";
import { computeMonthSalarySummary } from "@/lib/work-salary-summary";
import { computeFulltimeMonthSalarySummary } from "@/lib/fulltime-salary-summary";
import { isFulltimeWorkplace } from "@/lib/workplace-type";

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

/** 근무일·주휴 귀속 월(KST) — 급여 요약과 동일한 월 구분 */
function collectWorkMonthsFromRecords(records: WorkRecord[]): Set<string> {
  const months = new Set<string>();
  for (const r of records) {
    const dk = formatKstDateKey(parseDateSafe(r.date));
    months.add(monthKeyFromDateKey(dk));
    const mon = getKstMondayKeyFromDateKey(dk);
    const sun = getKstSundayKeyFromMondayKey(mon);
    months.add(monthKeyFromDateKey(sun));
  }
  return months;
}

function addCalendarMonths(
  y: number,
  m: number,
  delta: number
): { y: number; m: number } {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

function ymKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function collectBudgetMonthsForIncomeLines(
  records: WorkRecord[],
  existingBudgetMonths: string[]
): Set<string> {
  const out = new Set<string>();
  for (const wm of Array.from(collectWorkMonthsFromRecords(records))) {
    const [y, m] = wm.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) continue;
    const next = addCalendarMonths(y, m, 1);
    out.add(ymKey(next.y, next.m));
  }
  for (const bm of existingBudgetMonths) {
    out.add(bm);
  }
  return out;
}

async function ensureMonthlyBudget(month: string, userId: string) {
  const existing = await prisma.monthlyBudget.findFirst({
    where: { userId, month },
  });
  if (existing) return existing;
  return prisma.monthlyBudget.create({
    data: { userId, month, personalAllowance: 0 },
  });
}

/**
 * 한 근무지의 근무 기록을 기준으로, 급여 요약의 근무월별 실수령(net)을
 * **다음 달** 월별 예산 INCOME 한 줄에 반영합니다.
 */
async function applyWorkplaceIncomeBudgetLines(workplaceId: string): Promise<void> {
  const workplace = await prisma.workplace.findUnique({
    where: { id: workplaceId },
  });
  if (!workplace) return;

  const userId = workplace.userId;

  const records = await prisma.workRecord.findMany({
    where: { workplaceId },
  });

  const existingLinks = await prisma.cashFlow.findMany({
    where: { workplaceId },
    include: { monthlyBudget: true },
  });

  const existingBudgetMonths = existingLinks.map((l) => l.monthlyBudget.month);
  const months = collectBudgetMonthsForIncomeLines(records, existingBudgetMonths);

  for (const monthKey of Array.from(months)) {
    const [y, m] = monthKey.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) continue;

    const { y: workY, m: workM } = addCalendarMonths(y, m, -1);
    const summary = isFulltimeWorkplace(workplace)
      ? computeFulltimeMonthSalarySummary(records, workplace, workY, workM)
      : computeMonthSalarySummary(records, workY, workM);
    const net = Math.max(0, Math.round(summary.netPay));

    const budget = await ensureMonthlyBudget(monthKey, userId);

    const existing = await prisma.cashFlow.findFirst({
      where: { monthlyBudgetId: budget.id, workplaceId },
    });

    if (net <= 0) {
      if (existing) {
        await prisma.cashFlow.delete({ where: { id: existing.id } });
      }
      continue;
    }

    if (existing) {
      await prisma.cashFlow.update({
        where: { id: existing.id },
        data: {
          type: "INCOME",
          title: workplace.name,
          amount: net,
        },
      });
    } else {
      await prisma.cashFlow.create({
        data: {
          type: "INCOME",
          title: workplace.name,
          amount: net,
          monthlyBudgetId: budget.id,
          workplaceId,
        },
      });
    }
  }
}

function revalidateBudgetRelatedPaths() {
  revalidatePath("/budget");
  revalidatePath("/");
  revalidatePath("/work");
}

/** 근무 기록·근무지 설정 Server Action에서 호출 — 캐시 무효화 포함 */
export async function syncWorkplaceIncomeBudgetLines(
  workplaceId: string
): Promise<void> {
  try {
    await applyWorkplaceIncomeBudgetLines(workplaceId);
    revalidateBudgetRelatedPaths();
  } catch (e) {
    console.error("[syncWorkplaceIncomeBudgetLines]", workplaceId, e);
  }
}

/**
 * 알바 화면 진입 시 기존 근무 데이터를 예산 수입에 한꺼번에 맞춥니다.
 */
export async function syncAllWorkplacesIncomeBudgetForUser(
  userId: string
): Promise<void> {
  try {
    const list = await prisma.workplace.findMany({
      where: { userId },
      select: { id: true },
    });
    for (const { id } of list) {
      try {
        await applyWorkplaceIncomeBudgetLines(id);
      } catch (inner) {
        console.error("[applyWorkplaceIncomeBudgetLines]", id, inner);
      }
    }
  } catch (e) {
    console.error("[syncAllWorkplacesIncomeBudgetForUser]", userId, e);
  }
}
