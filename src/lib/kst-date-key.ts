/** 근무일·캘린더 셀 키로 쓰는 KST 기준 YYYY-MM-DD */
export function formatKstDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 서울 달력 기준 연·월 (대시보드·집계의 ‘이번 달’과 동일하게 맞춤) */
export function getKstCalendarYearMonth(
  d: Date = new Date()
): { year: number; month: number } {
  const key = formatKstDateKey(d);
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}
