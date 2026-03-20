export const BUDGET_CASHFLOW_TYPES = [
  "INCOME",
  "EXPENSE_FIXED",
  "EXPENSE_VAR",
  "SAVING",
] as const;

export type BudgetCashFlowType = (typeof BUDGET_CASHFLOW_TYPES)[number];

export const TYPE_LABELS: Record<BudgetCashFlowType, string> = {
  INCOME: "수입",
  EXPENSE_FIXED: "고정지출",
  EXPENSE_VAR: "변동지출",
  SAVING: "저축/투자",
};
