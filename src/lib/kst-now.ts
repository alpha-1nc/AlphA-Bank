import { formatKstDateKey } from "@/lib/kst-date-key";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 한국 시각(Asia/Seoul) 기준 날짜·시. 서버 TZ 설정과 무관하게 Intl 로 계산한다. */
export function getKstNow(now: Date = new Date()): { key: string; year: number; month: number; day: number; hour: number } {
  const key = formatKstDateKey(now);
  const [year, month, day] = key.split("-").map(Number);
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return { key, year, month, day, hour: Number(hourStr) % 24 };
}

/** YYYY-MM-DD 키에 일수를 더한 키 (순수 달력 계산) */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return t.toISOString().slice(0, 10);
}

/** new Date(y, m, d) 식의 "로컬 달력" Date 를 YYYY-MM-DD 로 (getBudgetPeriodRange 결과용, 서버 TZ 무관) */
export function localDateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
