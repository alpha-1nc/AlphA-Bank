export const SUBSCRIPTION_CATEGORIES = [
  "스트리밍",
  "AI",
  "음악",
  "생산성",
  "클라우드",
  "게임",
  "기타",
] as const;

export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number];
