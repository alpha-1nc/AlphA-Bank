import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getSystemSettings } from "@/app/actions/settings";
import { getCurrentBudgetMonth } from "@/lib/budget-utils";
import SubscriptionBoard from "./SubscriptionBoard";
import { RefreshCw } from "lucide-react";

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
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div>
          <h1 className="t3 hidden md:flex font-bold text-foreground mb-1 items-center gap-2 min-w-0">
            <RefreshCw className="h-6 w-6 text-primary shrink-0 transition-transform duration-300 md:hover:rotate-180" />
            <span className="break-words">구독 관리</span>
          </h1>
          <p className="t7 hidden md:block text-fg-tertiary">
            정기 구독 서비스 관리 및 예산 반영
          </p>
        </div>
      </header>

      <SubscriptionBoard
        subscriptions={subItems}
        currentBudgetMonth={currentBudgetMonth}
        totalMonthly={totalMonthly}
      />
    </div>
  );
}
