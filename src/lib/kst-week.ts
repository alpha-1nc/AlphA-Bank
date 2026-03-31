import { formatKstDateKey } from "@/lib/kst-date-key";

/** KST 기준 요일 (0=일 … 6=토) */
function getKstWeekdaySun0(date: Date): number {
  const s = date.toLocaleDateString("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[s] ?? 0;
}

function prevCalendarDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`
  );
  return formatKstDateKey(new Date(t.getTime() - 24 * 60 * 60 * 1000));
}

/**
 * 해당 KST 날짜가 속한 주의 월요일(같은 주 월~일 중 월요일)을 YYYY-MM-DD 키로 반환합니다.
 */
export function getKstMondayKeyFromDateKey(dateKey: string): string {
  let cur = dateKey;
  for (let i = 0; i < 7; i++) {
    const [y, m, d] = cur.split("-").map(Number);
    const t = new Date(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`
    );
    if (getKstWeekdaySun0(t) === 1) {
      return cur;
    }
    cur = prevCalendarDayKey(cur);
  }
  return dateKey;
}

/** 월요일 키로부터 해당 주 일요일의 YYYY-MM-DD (KST) */
export function getKstSundayKeyFromMondayKey(mondayKey: string): string {
  const [y, m, d] = mondayKey.split("-").map(Number);
  const t = new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`
  );
  return formatKstDateKey(new Date(t.getTime() + 6 * 24 * 60 * 60 * 1000));
}

export function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}
