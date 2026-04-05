"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { type BudgetCashFlowType } from "@/lib/budget-constants";

const SAVING_TYPE = "SAVING" as const;

export interface AddCashFlowData {
  type: BudgetCashFlowType;
  title: string;
  amount: number;
  monthlyBudgetId: string;
  accountId?: string;
}

/**
 * 월별 예산을 조회하거나 없으면 빈 예산안만 새로 생성해 반환합니다.
 */
export async function getOrCreateMonthlyBudget(month: string, userId?: string) {
  const uid = userId ?? (await getCurrentUserId());
  const existing = await prisma.monthlyBudget.findFirst({
    where: { userId: uid, month },
    include: {
      transactions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (existing) return existing;

  const budget = await prisma.monthlyBudget.create({
    data: { userId: uid, month, personalAllowance: 0 },
  });
  return prisma.monthlyBudget.findFirstOrThrow({
    where: { id: budget.id },
    include: { transactions: { orderBy: { createdAt: "asc" } } },
  });
}

/**
 * 이전 달 고정지출을 현재 월로 수동 불러오기합니다.
 */
export async function importPreviousFixedExpenses(currentMonth: string) {
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
          where: { type: "EXPENSE_FIXED" },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.monthlyBudget.findFirst({
      where: { userId, month: currentMonth },
    }),
  ]);

  if (!currentBudget) return { imported: 0 };
  const fixedFromPrev = (prevBudget?.transactions ?? []).map((t) => ({
    title: t.title,
    amount: t.amount,
    accountId: t.accountId,
  }));
  if (fixedFromPrev.length === 0) return { imported: 0 };

  await prisma.cashFlow.deleteMany({
    where: { monthlyBudgetId: currentBudget.id, type: "EXPENSE_FIXED" },
  });
  await prisma.cashFlow.createMany({
    data: fixedFromPrev.map((f) => ({
      type: "EXPENSE_FIXED" as const,
      title: f.title,
      amount: f.amount,
      isCompleted: false,
      monthlyBudgetId: currentBudget.id,
      accountId: f.accountId,
    })),
  });

  revalidatePath("/budget");
  revalidatePath("/");
  return { imported: fixedFromPrev.length };
}

export interface UpdateCashFlowData {
  title?: string;
  amount?: string | number;
  accountId?: string | null;
}

/**
 * 개별 CashFlow(현금흐름)의 이름, 금액, 계좌를 수정합니다.
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

  const updateData: { title?: string; amount?: number; accountId?: string | null } = {};

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
  if (data.accountId !== undefined) {
    updateData.accountId = data.accountId || null;
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

  await prisma.cashFlow.create({
    data: {
      type: data.type,
      title: data.title.trim(),
      amount: data.amount,
      monthlyBudgetId: data.monthlyBudgetId,
      accountId: data.accountId ?? null,
    },
  });
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function toggleCashFlow(
  id: string,
  currentStatus: boolean,
  accountId: string | null,
  amount: number,
  type: string
) {
  const userId = await getCurrentUserId();
  const newStatus = !currentStatus;

  if (type === SAVING_TYPE && accountId) {
    await prisma.$transaction(async (tx) => {
      const flow = await tx.cashFlow.findFirst({
        where: { id, monthlyBudget: { userId } },
      });
      if (!flow) return;

      await tx.cashFlow.update({
        where: { id },
        data: { isCompleted: newStatus },
      });

      const account = await tx.account.findFirst({
        where: { id: accountId, userId },
        select: { initialBalance: true },
      });

      if (!account) return;

      const delta = newStatus ? amount : -amount;
      await tx.account.updateMany({
        where: { id: accountId, userId },
        data: { initialBalance: account.initialBalance + delta },
      });
    });
  } else {
    const flow = await prisma.cashFlow.findFirst({
      where: { id, monthlyBudget: { userId } },
    });
    if (!flow) return;
    await prisma.cashFlow.update({
      where: { id },
      data: { isCompleted: newStatus },
    });
  }

  revalidatePath("/budget");
  revalidatePath("/asset");
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

export async function updatePersonalAllowance(id: string, amount: number) {
  const userId = await getCurrentUserId();
  await prisma.monthlyBudget.updateMany({
    where: { id, userId },
    data: { personalAllowance: amount },
  });
  revalidatePath("/budget");
  revalidatePath("/");
}
