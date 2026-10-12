export const ACCOUNT_TYPES = [
  "입출금",
  "목적자금",
  "저축",
  "증권",
  "연금",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
