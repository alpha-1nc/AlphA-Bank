import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/app/actions/settings";
import { getCurrentBudgetMonth } from "@/lib/budget-utils";
import SubscriptionBoard from "./SubscriptionBoard";
import { RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const [subscriptions, accounts, systemSettings] = await Promise.all([
    prisma.subscription.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
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
    accountId: s.accountId,
    memo: s.memo,
  }));

  const accountItems = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
  }));

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2.5 min-w-0">
            <RefreshCw className="h-8 w-8 text-primary shrink-0" />
            <span className="break-words">구독 관리</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            정기 구독 서비스 관리 및 예산 반영
          </p>
        </div>
      </header>

      <SubscriptionBoard
        subscriptions={subItems}
        accounts={accountItems}
        currentBudgetMonth={currentBudgetMonth}
        totalMonthly={totalMonthly}
      />
    </div>
  );
}
