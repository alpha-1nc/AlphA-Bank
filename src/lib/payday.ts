import { isHoliday } from "@/lib/holidays-kr";
import { formatKstDateKey, getKstCalendarYearMonth } from "@/lib/kst-date-key";
import { addMonths, effectivePaydayDay } from "@/lib/work-pay-schedule";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** KST 달력 y-m-d의 00:00 KST에 해당하는 순간 (kst-month-range의 근무일 정규화와 동일한 표현) */
function kstMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS);
}

/** 달력 날짜(y-m-d)의 요일 (0=일 … 6=토). 시간대와 무관한 순수 달력 계산 */
function weekdayOf(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * 해당 월의 급여 지급일. paydayOfMonth가 말일보다 크면 말일로 처리하고,
 * 토·일·공휴일이면 하루씩 앞으로 당겨 가장 가까운 평일로 한다. (KST 00:00 기준 Date)
 */
export function resolvePayday(year: number, month: number, paydayOfMonth: number): Date {
  let day = effectivePaydayDay(year, month, paydayOfMonth);
  for (;;) {
    const wd = weekdayOf(year, month, day);
    const date = kstMidnight(year, month, day);
    if (wd !== 0 && wd !== 6 && !isHoliday(date)) return date;
    // 달력 계산으로 하루 전 (월 경계 포함)
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    year = prev.getUTCFullYear();
    month = prev.getUTCMonth() + 1;
    day = prev.getUTCDate();
  }
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** 오늘(KST) 기준 다음 지급일. 이번 달 지급일이 오늘 포함 아직 안 지났으면 이번 달, 아니면 다음 달. */
export function getNextPayday(
  paydayOfMonth: number,
  today: Date = new Date()
): { date: Date; daysUntil: number; originalDate: Date } {
  const todayKey = formatKstDateKey(today);
  const { year, month } = getKstCalendarYearMonth(today);

  let target = { year, month };
  let date = resolvePayday(target.year, target.month, paydayOfMonth);
  if (formatKstDateKey(date) < todayKey) {
    target = addMonths(year, month, 1);
    date = resolvePayday(target.year, target.month, paydayOfMonth);
  }
  /** 주말·공휴일 보정 전의 원래 지급일 */
  const originalDate = kstMidnight(
    target.year,
    target.month,
    effectivePaydayDay(target.year, target.month, paydayOfMonth)
  );

  return { date, daysUntil: dayNumber(formatKstDateKey(date)) - dayNumber(todayKey), originalDate };
}
