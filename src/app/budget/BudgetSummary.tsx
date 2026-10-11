"use client";

import { TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react";
import { formatWon } from "@/lib/format-money";

interface BudgetSummaryProps {
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  livingBalance: number;
}

/** 카드 배경은 모두 card. 금액 색만 의미에 따라 (수입·생활비 foreground, 지출 negative, 저축 positive) */
const cards: {
  key: "income" | "expense" | "saving" | "living";
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "income", label: "예상 수입", icon: TrendingUp, color: "text-foreground" },
  { key: "expense", label: "예상 지출", icon: TrendingDown, color: "text-negative" },
  { key: "saving", label: "저축 및 투자", icon: PiggyBank, color: "text-positive" },
  { key: "living", label: "생활비 잔액", icon: Wallet, color: "text-foreground" },
];

export function BudgetSummary({
  totalIncome,
  totalExpense,
  totalSaving,
  livingBalance,
}: BudgetSummaryProps) {
  const values = {
    income: totalIncome,
    expense: totalExpense,
    saving: totalSaving,
    living: livingBalance,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {cards.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="rounded-card bg-card p-5">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-fg-tertiary" />
            <span className="t7 truncate text-fg-tertiary">{label}</span>
          </div>
          <p className={`t4 numeric mt-2 font-bold ${color}`}>{formatWon(values[key])}</p>
        </div>
      ))}
    </div>
  );
}
