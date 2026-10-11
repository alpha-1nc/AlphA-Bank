/**
 * 예산 월(YYYY-MM)의 통제 기간 [시작, 끝]. /budget과 대시보드가 같은 함수를 쓴다.
 *
 * 규칙: M월 예산 = M월 (기준일) ~ (M+1)월 (기준일 − 1)
 *   예) 기준일 10, 10월 예산 → 10/10 ~ 11/09 · 기준일 1 → 10/01 ~ 10/31
 * 그 달에 기준일이 없으면(예: 31일, 2월) 그 달 말일을 시작일로 한다.
 * 종료일은 "다음 달 시작일의 전날"이라 같은 말일 규칙이 그대로 적용된다.
 * (getCurrentBudgetMonth의 "기준일이 지나면 그 달 예산" 규칙과 일치)
 */
export function getBudgetPeriodRange(month: string, budgetStartDate: number): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const startDay = budgetStartDate || 1;

  /** monthIndex(0-based, 넘치면 다음 해로)의 기간 시작일 — 기준일이 없으면 말일 */
  const periodStart = (monthIndex: number): Date => {
    const lastDay = new Date(y, monthIndex + 1, 0).getDate();
    return new Date(y, monthIndex, Math.min(startDay, lastDay));
  };

  const start = periodStart(m - 1);
  const nextStart = periodStart(m);
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1);
  return { start, end };
}
