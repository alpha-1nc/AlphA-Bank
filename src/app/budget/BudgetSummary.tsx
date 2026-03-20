"use client";

import { useState, useTransition } from "react";
import { updatePersonalAllowance } from "@/app/actions/budget";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Banknote } from "lucide-react";

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface BudgetSummaryProps {
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  livingBalance: number;
  personalAllowance: number;
  budgetId: string;
}

const cards: {
  key: "income" | "expense" | "saving" | "living" | "allowance";
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { key: "income", label: "예상 수입", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  { key: "expense", label: "예상 지출", icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
  { key: "saving", label: "저축 및 투자", icon: PiggyBank, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { key: "living", label: "생활비 잔액", icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
  { key: "allowance", label: "개인 용돈", icon: Banknote, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
];

export function BudgetSummary({
  totalIncome,
  totalExpense,
  totalSaving,
  livingBalance,
  personalAllowance,
  budgetId,
}: BudgetSummaryProps) {
  const [editingAllowance, setEditingAllowance] = useState(false);
  const [inputValue, setInputValue] = useState(String(personalAllowance));
  const [isPending, startTransition] = useTransition();

  function handleAllowanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(inputValue.replace(/,/g, ""), 10);
    if (isNaN(parsed) || parsed < 0) return;
    startTransition(async () => {
      await updatePersonalAllowance(budgetId, parsed);
      setEditingAllowance(false);
    });
  }

  const values = {
    income: totalIncome,
    expense: totalExpense,
    saving: totalSaving,
    living: livingBalance,
    allowance: personalAllowance,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {cards.map(({ key, label, icon: Icon, color, bg }) => {
        const isAllowance = key === "allowance";
        const value = values[key];

        return (
          <Card
            key={key}
            className={`rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${isAllowance ? "cursor-pointer" : ""}`}
            onClick={isAllowance && !editingAllowance ? () => setEditingAllowance(true) : undefined}
          >
            <CardHeader className={`py-3 px-5 ${bg}`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="py-4 px-5">
              {isAllowance && editingAllowance ? (
                <form onSubmit={handleAllowanceSubmit} onClick={(e) => e.stopPropagation()} className="flex gap-2">
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(inputValue.replace(/,/g, ""), 10);
                      if (!isNaN(parsed) && parsed >= 0) {
                        startTransition(async () => {
                          await updatePersonalAllowance(budgetId, parsed);
                        });
                      }
                      setEditingAllowance(false);
                    }}
                    autoFocus
                    className="h-9 text-base font-black tracking-tighter rounded-xl flex-1 dark:bg-[#09090B] dark:text-slate-100 dark:border-white/10"
                    disabled={isPending}
                  />
                  <Button type="submit" size="sm" disabled={isPending} className="shrink-0 rounded-xl">
                    저장
                  </Button>
                </form>
              ) : (
                <p className={`text-xl font-black tracking-tighter ${color}`}>
                  {formatKRW(value)}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
