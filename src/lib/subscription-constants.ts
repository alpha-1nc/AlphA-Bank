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

export const CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
  "스트리밍": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "AI":       "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "음악":     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "생산성":   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "클라우드": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "게임":     "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "기타":     "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};
