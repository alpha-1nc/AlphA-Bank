export const ACCOUNT_TYPES = [
  "입출금",
  "금고",
  "저축",
  "증권",
  "연금",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
