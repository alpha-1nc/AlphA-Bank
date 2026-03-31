import { getMondayOfWeek } from "@/utils/calculator";

/** 해당 날짜가 속한 주(월요일 00:00 ~ 일요일 23:59:59.999, 브라우저 로컬 기준) */
export function getLocalWeekRangeContaining(anchor: Date): {
  startInclusive: Date;
  endInclusive: Date;
} {
  const mon = getMondayOfWeek(new Date(anchor));
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { startInclusive: mon, endInclusive: sun };
}
