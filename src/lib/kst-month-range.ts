/**
 * 한국 표준시(KST, UTC+9) 기준 연·월의 [시작, 끝]을 UTC Date로 반환합니다.
 * DB에 저장된 DateTime과 비교할 때 서버가 UTC로 동작해도 달력 월이 어긋나지 않도록 합니다.
 *
 * - 시작: 해당 월 1일 00:00:00.000 KST의 순간(UTC 인스턴스)
 * - 끝: 해당 월 말일 23:59:59.999 KST의 순간(UTC 인스턴스)
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getKstMonthRangeUtc(year: number, month: number): {
  startInclusive: Date;
  endInclusive: Date;
} {
  if (month < 1 || month > 12) {
    throw new RangeError("month must be 1–12");
  }

  const startInclusive = new Date(
    Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - KST_OFFSET_MS
  );

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endInclusive = new Date(
    Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - KST_OFFSET_MS
  );

  return { startInclusive, endInclusive };
}

/**
 * 근무일(`date`) 저장용: 입력 시각을 서울 달력 기준 "그 날짜"의 00:00:00 KST에 해당하는 UTC 순간으로 맞춥니다.
 * (클라이언트가 UTC 자정 등으로 보내 달력이 하루 밀리는 것을 방지)
 */
export function normalizeKstCalendarDateUtc(input: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(input);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (!y || !m || !day) {
    throw new Error("Invalid date for KST normalization");
  }
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0) - KST_OFFSET_MS);
}

function addMonthsUtc(
  year: number,
  month: number,
  delta: number
): { y: number; m: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

/**
 * 최근 6개월 창 + 주차 경계 버퍼: 급여 집계·차트용 WorkRecord 조회 범위
 */
export function getKstWideFetchRangeUtc(
  endYear: number,
  endMonth: number,
  bufferDays = 14
): { start: Date; end: Date } {
  const { y: ys, m: ms } = addMonthsUtc(endYear, endMonth, -5);
  const { startInclusive } = getKstMonthRangeUtc(ys, ms);
  const { endInclusive } = getKstMonthRangeUtc(endYear, endMonth);
  const buf = bufferDays * 24 * 60 * 60 * 1000;
  return {
    start: new Date(startInclusive.getTime() - buf),
    end: new Date(endInclusive.getTime() + buf),
  };
}
