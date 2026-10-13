/** 해당 월의 일수 (month: 0~11, 범위를 넘으면 연도 보정) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 오늘부터 다음 결제일까지 남은 일수 (오늘이 결제일이면 0).
 * 해당 월에 그 날짜가 없으면(예: 31일 → 30일까지인 달) 그 달의 마지막 날로 보정한다.
 * 이번 달 결제일이 지났으면 다음 달(월말·연말 포함)로 계산한다. 결과는 항상 0 이상.
 */
export function daysUntilBilling(billingDay: number, now: Date = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const thisMonthDays = daysInMonth(year, month);

  const thisMonthBilling = Math.min(billingDay, thisMonthDays);
  if (thisMonthBilling >= today) return thisMonthBilling - today;

  // new Date(year, month + 1, …) 이 연도 넘김(12월 → 1월)을 처리
  const nextMonthBilling = Math.min(billingDay, daysInMonth(year, month + 1));
  return thisMonthDays - today + nextMonthBilling;
}

/** 활성 구독의 결제일 라벨: 오늘 / 내일 / D-n */
export function formatBillingCountdown(days: number): string {
  if (days === 0) return "오늘";
  if (days === 1) return "내일";
  return `D-${days}`;
}
