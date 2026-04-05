"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateMonthlyBudget } from "./budget";

function assertBillingDay(day: number): number | null {
  if (!Number.isFinite(day)) return null;
  const d = Math.floor(day);
  if (d < 1 || d > 31) return null;
  return d;
}

export interface AddSubscriptionData {
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  accountId?: string | null;
  memo?: string | null;
}

export async function addSubscription(data: AddSubscriptionData) {
  const userId = await getCurrentUserId();
  if (!Number.isFinite(data.amount) || data.amount < 0) return;
  const billingDay = assertBillingDay(data.billingDay);
  if (billingDay === null) return;

  await prisma.subscription.create({
    data: {
      userId,
      name: data.name.trim(),
      amount: data.amount,
      billingDay,
      category: data.category,
      accountId: data.accountId ?? null,
      memo: data.memo?.trim() ?? null,
    },
  });
  revalidatePath("/subscription", "page");
  revalidatePath("/", "page");
}

export interface UpdateSubscriptionData {
  name?: string;
  amount?: number;
  billingDay?: number;
  category?: string;
  accountId?: string | null;
  memo?: string | null;
}

export async function updateSubscription(id: string, data: UpdateSubscriptionData) {
  const userId = await getCurrentUserId();
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed) updateData.name = trimmed;
  }
  if (data.amount !== undefined && !isNaN(data.amount) && data.amount >= 0) {
    updateData.amount = data.amount;
  }
  if (data.billingDay !== undefined && !isNaN(data.billingDay)) {
    const d = assertBillingDay(data.billingDay);
    if (d !== null) updateData.billingDay = d;
  }
  if (data.category !== undefined && data.category.trim()) {
    updateData.category = data.category;
  }
  if (data.accountId !== undefined) {
    updateData.accountId = data.accountId || null;
  }
  if (data.memo !== undefined) {
    updateData.memo = data.memo?.trim() || null;
  }

  if (Object.keys(updateData).length === 0) return;

  await prisma.subscription.updateMany({ where: { id, userId }, data: updateData });
  revalidatePath("/subscription", "page");
  revalidatePath("/", "page");
}

export async function deleteSubscription(id: string) {
  const userId = await getCurrentUserId();
  await prisma.subscription.deleteMany({ where: { id, userId } });
  revalidatePath("/subscription", "page");
  revalidatePath("/", "page");
}

export async function toggleSubscriptionActive(id: string) {
  const userId = await getCurrentUserId();
  const sub = await prisma.subscription.findFirst({
    where: { id, userId },
    select: { isActive: true },
  });
  if (!sub) return;
  await prisma.subscription.updateMany({
    where: { id, userId },
    data: { isActive: !sub.isActive },
  });
  revalidatePath("/subscription", "page");
  revalidatePath("/", "page");
}

/**
 * 구독 하나를 현재월 예산의 고정지출(EXPENSE_FIXED)로 추가합니다.
 */
export async function addSubscriptionToBudget(
  subscriptionId: string,
  month: string
): Promise<{ success: boolean; alreadyExists?: boolean }> {
  const userId = await getCurrentUserId();
  const sub = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });
  if (!sub) return { success: false };

  const budget = await getOrCreateMonthlyBudget(month, userId);

  const existing = budget.transactions.find(
    (t) => t.type === "EXPENSE_FIXED" && t.title === sub.name
  );
  if (existing) return { success: true, alreadyExists: true };

  await prisma.cashFlow.create({
    data: {
      type: "EXPENSE_FIXED",
      title: sub.name,
      amount: sub.amount,
      isCompleted: false,
      monthlyBudgetId: budget.id,
      accountId: sub.accountId ?? null,
    },
  });

  revalidatePath("/subscription", "page");
  revalidatePath("/budget", "page");
  return { success: true };
}

/**
 * 활성 구독 전체를 현재월 예산에 일괄 반영합니다.
 */
export async function addAllSubscriptionsToBudget(
  month: string
): Promise<{ added: number; skipped: number }> {
  const userId = await getCurrentUserId();
  const [activeSubs, budget] = await Promise.all([
    prisma.subscription.findMany({ where: { userId, isActive: true } }),
    getOrCreateMonthlyBudget(month, userId),
  ]);

  const existingTitles = new Set(
    budget.transactions
      .filter((t) => t.type === "EXPENSE_FIXED")
      .map((t) => t.title)
  );

  const toAdd = activeSubs.filter((s) => !existingTitles.has(s.name));
  const skipped = activeSubs.length - toAdd.length;

  if (toAdd.length > 0) {
    await prisma.$transaction(
      toAdd.map((s) =>
        prisma.cashFlow.create({
          data: {
            type: "EXPENSE_FIXED",
            title: s.name,
            amount: s.amount,
            isCompleted: false,
            monthlyBudgetId: budget.id,
            accountId: s.accountId ?? null,
          },
        })
      )
    );
  }

  revalidatePath("/subscription", "page");
  revalidatePath("/budget", "page");
  return { added: toAdd.length, skipped };
}
