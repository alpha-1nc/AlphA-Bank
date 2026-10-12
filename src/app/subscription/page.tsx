import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getSystemSettings } from "@/app/actions/settings";
import { getCurrentBudgetMonth } from "@/lib/budget-utils";
import SubscriptionBoard from "./SubscriptionBoard";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const userId = await getCurrentUserId();
  const [subscriptions, systemSettings] = await Promise.all([
    prisma.subscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    getSystemSettings(),
  ]);

  const currentBudgetMonth = getCurrentBudgetMonth(systemSettings.budgetStartDate);

  const totalMonthly = subscriptions
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.amount, 0);

  const subItems = subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    billingDay: s.billingDay,
    category: s.category,
    isActive: s.isActive,
    memo: s.memo,
  }));

  return (
    <SubscriptionBoard
      subscriptions={subItems}
      currentBudgetMonth={currentBudgetMonth}
      totalMonthly={totalMonthly}
    />
  );
}
