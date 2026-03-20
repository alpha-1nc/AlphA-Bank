/**
 * 설정의 예산 기준일에 따른 현재 예산 월(YYYY-MM) 반환
 * 기준일 5일 → 4/4까지는 3월 예산, 4/5부터 4월 예산
 */
export function getCurrentBudgetMonth(budgetStartDate: number): string {
  const today = new Date();
  const startDay = budgetStartDate || 1;
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth() + 1; // 1~12

  if (today.getDate() < startDay) {
    targetMonth -= 1;
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    }
  }
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
}
