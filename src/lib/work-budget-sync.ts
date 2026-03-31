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

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

/** 근무일·주휴 귀속 월(KST) — 급여 요약과 동일한 월 구분 */
function collectBudgetMonthsFromRecords(records: WorkRecord[]): Set<string> {
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

async function ensureMonthlyBudget(month: string) {
  const existing = await prisma.monthlyBudget.findUnique({
    where: { month },
  });
  if (existing) return existing;
  return prisma.monthlyBudget.create({
    data: { month, personalAllowance: 0 },
  });
}

/**
 * 한 근무지의 근무 기록을 기준으로, 급여 요약의 월별 실수령(net)과 동일하게
 * 월별 예산의 INCOME 한 줄(분류 수입 / 내역 근무지명)을 생성·갱신·삭제합니다.
 * workplaceId가 없는 다른 수입 항목은 변경하지 않습니다.
 */
async function applyWorkplaceIncomeBudgetLines(workplaceId: string): Promise<void> {
  const workplace = await prisma.workplace.findUnique({
    where: { id: workplaceId },
  });
  if (!workplace) return;

  const records = await prisma.workRecord.findMany({
    where: { workplaceId },
  });

  const existingLinks = await prisma.cashFlow.findMany({
    where: { workplaceId },
    include: { monthlyBudget: true },
  });

  const months = collectBudgetMonthsFromRecords(records);
  for (const link of existingLinks) {
    months.add(link.monthlyBudget.month);
  }

  for (const monthKey of Array.from(months)) {
    const [y, m] = monthKey.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) continue;

    const summary = computeMonthSalarySummary(records, y, m);
    const net = Math.max(0, Math.round(summary.netPay));

    const budget = await ensureMonthlyBudget(monthKey);

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
 * 서버 컴포넌트 렌더 중에 호출되므로 `revalidatePath`는 사용하지 않습니다.
 * (Next.js: revalidatePath는 Server Action / Route Handler에서만 허용)
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
