import { isExpenseType } from "@/lib/cashflow-categories";

/** 월별 예산 지표 계산 (/budget과 대시보드가 같은 식을 쓰도록 공용화) */
export function computeBudgetTotals(transactions: { type: string; amount: number }[]) {
  const sum = (pred: (type: string) => boolean) =>
    transactions.filter((c) => pred(c.type)).reduce((s, c) => s + c.amount, 0);

  const totalIncome = sum((t) => t === "INCOME");
  const totalExpense = sum(isExpenseType);
  const totalSaving = sum((t) => t === "SAVING");
  const livingBalance = totalIncome - totalExpense - totalSaving;
  /** 저축률(%) = 저축·투자 ÷ 수입 × 100. 수입이 0이면 null */
  const savingRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : null;

  return { totalIncome, totalExpense, totalSaving, livingBalance, savingRate };
}
