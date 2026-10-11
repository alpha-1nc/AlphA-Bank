/** 금액 표기: 644130 → "644,130원", -5000 → "-5,000원" */
export function formatWon(amount: number): string {
  const n = Math.round(amount);
  return `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ko-KR")}원`;
}
