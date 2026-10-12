/** 금액 축약: 930000 → "93만", 150000000 → "2억" */
export function formatCompactWon(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return String(value);
}
