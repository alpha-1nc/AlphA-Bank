/**
 * 통상시급 = 월 기본급 ÷ 월 소정근로시간(209h)
 * 209시간 = 주 40h × (365/7/12) ≈ 174h + 주휴 35h
 */
export function computeOrdinaryHourlyWage(monthlyBaseSalary: number): number {
  return Math.round(monthlyBaseSalary / 209);
}
