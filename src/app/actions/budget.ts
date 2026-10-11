"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { ensureUserRowExists } from "@/lib/ensure-user";
import {
  normalizeEmoji,
  normalizeSectionCategory,
  type CashFlowSection,
} from "@/lib/cashflow-categories";

export interface AddCashFlowData {
  /** 섹션: INCOME | EXPENSE | SAVING */
  type: CashFlowSection;
  /** 섹션 내 카테고리 키 (INCOME은 생략/null) */
  category?: string | null;
  emoji?: string | null;
  title: string;
  amount: number;
  monthlyBudgetId: string;
}

/**
 * 월별 예산을 조회하거나 없으면 빈 예산안만 새로 생성해 반환합니다.
 */
export async function getOrCreateMonthlyBudget(month: string, userId?: string) {
  const uid = userId ?? (await getCurrentUserId());
  await ensureUserRowExists(uid);
  const existing = await prisma.monthlyBudget.findFirst({
    where: { userId: uid, month },
    include: {
      transactions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (existing) return existing;

  const budget = await prisma.monthlyBudget.create({
    data: { userId: uid, month },
  });
  return prisma.monthlyBudget.findFirstOrThrow({
    where: { id: budget.id },
    include: { transactions: { orderBy: { createdAt: "asc" } } },
  });
}

export interface ImportPreviousMonthResult {
  added: number;
  skipped: number;
  /** 이전 달에 복사 대상(지출·저축·투자)이 하나도 없음 */
  noSource: boolean;
}

/**
 * 이전 달의 지출·저축·투자 항목을 현재 월로 불러옵니다 (수입·근무지 자동 수입 제외).
 * 금액·카테고리·이모지를 복사하고 isCompleted는 false로 생성합니다.
 * 이번 달 기존 항목은 삭제하지 않으며, 같은 type + title이 이미 있으면 건너뜁니다.
 */
export async function importPreviousMonthItems(currentMonth: string): Promise<ImportPreviousMonthResult> {
  const userId = await getCurrentUserId();
  const [yearStr, monthStr] = currentMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }
  const prevMonthStr = `${year}-${String(month).padStart(2, "0")}`;

  const [prevBudget, currentBudget] = await Promise.all([
    prisma.monthlyBudget.findFirst({
      where: { userId, month: prevMonthStr },
      include: {
        transactions: {
          where: { type: { in: ["EXPENSE", "SAVING"] }, workplaceId: null },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getOrCreateMonthlyBudget(currentMonth, userId),
  ]);

  const source = prevBudget?.transactions ?? [];
  if (source.length === 0) return { added: 0, skipped: 0, noSource: true };

  const existingKeys = new Set(currentBudget.transactions.map((t) => `${t.type}|${t.title}`));
  const toCreate: typeof source = [];
  for (const t of source) {
    const key = `${t.type}|${t.title}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    toCreate.push(t);
  }

  if (toCreate.length > 0) {
    await prisma.cashFlow.createMany({
      data: toCreate.map((t) => ({
        type: t.type,
        category: t.category,
        emoji: t.emoji,
        title: t.title,
        amount: t.amount,
        isCompleted: false,
        monthlyBudgetId: currentBudget.id,
      })),
    });
  }

  revalidatePath("/budget");
  revalidatePath("/");
  return { added: toCreate.length, skipped: source.length - toCreate.length, noSource: false };
}

export interface UpdateCashFlowData {
  title?: string;
  amount?: string | number;
  /** 섹션 변경 시 category와 함께 전달 */
  type?: CashFlowSection;
  category?: string | null;
  /** 빈 문자열/null이면 이모지 제거 */
  emoji?: string | null;
}

/**
 * 개별 CashFlow(현금흐름)의 이름, 금액, 계좌, 섹션·카테고리, 이모지를 수정합니다.
 * 알바 근무지에서 동기화된 수입(workplaceId 있음)은 근무 기록에서만 갱신됩니다.
 */
export async function updateCashFlow(id: string, data: UpdateCashFlowData) {
  const userId = await getCurrentUserId();
  const linked = await prisma.cashFlow.findFirst({
    where: { id, monthlyBudget: { userId } },
    select: { workplaceId: true },
  });
  if (!linked) return;
  if (linked.workplaceId) return;

  const updateData: {
    title?: string;
    amount?: number;
    type?: string;
    category?: string | null;
    emoji?: string | null;
  } = {};

  if (data.title !== undefined) {
    const trimmed = data.title.trim();
    if (!trimmed) return;
    updateData.title = trimmed;
  }
  if (data.amount !== undefined) {
    const num = typeof data.amount === "string" ? parseInt(data.amount, 10) : data.amount;
    if (!isNaN(num) && num >= 0) {
      updateData.amount = num;
    }
  }
  if (data.type !== undefined) {
    const normalized = normalizeSectionCategory(data.type, data.category);
    if (!normalized) return;
    updateData.type = normalized.type;
    updateData.category = normalized.category;
  }
  if (data.emoji !== undefined) {
    updateData.emoji = normalizeEmoji(data.emoji);
  }

  if (Object.keys(updateData).length === 0) return;

  await prisma.cashFlow.update({
    where: { id },
    data: updateData,
  });
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function addCashFlow(data: AddCashFlowData) {
  const userId = await getCurrentUserId();
  const budget = await prisma.monthlyBudget.findFirst({
    where: { id: data.monthlyBudgetId, userId },
  });
  if (!budget) return;

  const normalized = normalizeSectionCategory(data.type, data.category);
  if (!normalized) return;

  await prisma.cashFlow.create({
    data: {
      type: normalized.type,
      category: normalized.category,
      emoji: normalizeEmoji(data.emoji),
      title: data.title.trim(),
      amount: data.amount,
      monthlyBudgetId: data.monthlyBudgetId,
    },
  });
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function toggleCashFlow(id: string, currentStatus: boolean) {
  const userId = await getCurrentUserId();
  const flow = await prisma.cashFlow.findFirst({
    where: { id, monthlyBudget: { userId } },
  });
  if (!flow) return;
  await prisma.cashFlow.update({
    where: { id },
    data: { isCompleted: !currentStatus },
  });

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteCashFlow(id: string) {
  const userId = await getCurrentUserId();
  const row = await prisma.cashFlow.findFirst({
    where: { id, monthlyBudget: { userId } },
  });
  if (!row) return;
  if (row.workplaceId) return;
  await prisma.cashFlow.delete({ where: { id } });
  revalidatePath("/budget");
  revalidatePath("/");
}
