import { formatKstDateKey } from "@/lib/kst-date-key";

export const PAY_PERIOD_MODE = {
  CALENDAR_MONTH: "CALENDAR_MONTH",
  ROLLING_BEFORE_PAYDAY: "ROLLING_BEFORE_PAYDAY",
} as const;

export type PayPeriodMode =
  (typeof PAY_PERIOD_MODE)[keyof typeof PAY_PERIOD_MODE];

/** DB·레거시 값(공백·영문 문구 등)을 UI/Select용 상수로 맞춥니다. */
export function normalizePayPeriodMode(
  raw: string | null | undefined
): PayPeriodMode {
  const s = (raw ?? "").trim();
  if (!s) return PAY_PERIOD_MODE.CALENDAR_MONTH;
  const u = s.toUpperCase().replace(/\s+/g, "_");
  if (u === PAY_PERIOD_MODE.CALENDAR_MONTH) {
    return PAY_PERIOD_MODE.CALENDAR_MONTH;
  }
  if (u === PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY) {
    return PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY;
  }
  const lower = s.toLowerCase();
  if (
    lower.includes("rolling") ||
    lower.includes("전날") ||
    lower.includes("before")
  ) {
    return PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY;
  }
  if (
    lower.includes("calendar") ||
    lower.includes("말일") ||
    lower.includes("익월") ||
    lower.includes("당월")
  ) {
    return PAY_PERIOD_MODE.CALENDAR_MONTH;
  }
  return PAY_PERIOD_MODE.CALENDAR_MONTH;
}

const PAY_PERIOD_LABELS: Record<PayPeriodMode, string> = {
  [PAY_PERIOD_MODE.CALENDAR_MONTH]: "당월 1일~말일",
  [PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY]: "전 월급일~이번 월급 전날",
};

export function payPeriodModeLabel(mode: string): string {
  return PAY_PERIOD_LABELS[normalizePayPeriodMode(mode)];
}

export function getKstYmd(): { y: number; m: number; d: number } {
  const key = formatKstDateKey(new Date());
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** 해당 월에서 실제 월급일 (31일 고정인데 2월이면 28/29일) */
export function effectivePaydayDay(
  y: number,
  m: number,
  paydayOfMonth: number
): number {
  return Math.min(paydayOfMonth, daysInMonth(y, m));
}

export function addMonths(
  y: number,
  m: number,
  delta: number
): { year: number; month: number } {
  const idx = m - 1 + delta;
  const year = y + Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;
  return { year, month: month + 1 };
}

/** 근무월 W의 급여 지급일(다음 달 월급일)을 KST 달력 숫자로 비교하기 위한 키 */
function paymentDateKeyForWorkMonth(
  workYear: number,
  workMonth: number,
  paydayOfMonth: number
): number {
  const next = addMonths(workYear, workMonth, 1);
  const d = effectivePaydayDay(next.year, next.month, paydayOfMonth);
  return next.year * 10000 + next.month * 100 + d;
}

function todayKstComparable(): number {
  const { y, m, d } = getKstYmd();
  return y * 10000 + m * 100 + d;
}

/**
 * 아직 지급 전인 **가장 이른** 근무 달력월 (KST).
 * 근무월 M분은 (M+1)월의 월급일에 지급된다고 보고, 오늘이 그 지급일 이전이면
 * 해당 근무월이 ‘현재 예상 급여’에 해당합니다.
 * (예: 월급일 10일 → 4/9까지는 3월 근무분, 4/10부터는 4월 근무분)
 */
export function earliestUnpaidWorkMonth(
  paydayOfMonth: number
): { year: number; month: number } {
  const today = todayKstComparable();
  const { y, m } = getKstYmd();
  let W = addMonths(y, m, -1);
  for (let guard = 0; guard < 24; guard++) {
    const payK = paymentDateKeyForWorkMonth(W.year, W.month, paydayOfMonth);
    if (today < payK) {
      const prevW = addMonths(W.year, W.month, -1);
      const prevPayK = paymentDateKeyForWorkMonth(
        prevW.year,
        prevW.month,
        paydayOfMonth
      );
      if (today >= prevPayK) {
        return W;
      }
      W = prevW;
    } else {
      W = addMonths(W.year, W.month, 1);
    }
  }
  return addMonths(y, m, -1);
}

/**
 * 급여 계산기 달력 기본 월 (KST). {@link earliestUnpaidWorkMonth}와 동일합니다.
 */
export function getDefaultViewMonth(
  paydayOfMonth: number
): { year: number; month: number } {
  return earliestUnpaidWorkMonth(paydayOfMonth);
}

function fmtShort(y: number, m: number, d: number): string {
  return `${m}/${d}`;
}

/**
 * 달력에 보이는 월 기준 급여 기간 설명 (한 줄)
 */
export function payPeriodCaption(
  viewYear: number,
  viewMonth: number,
  paydayOfMonth: number,
  mode: PayPeriodMode
): string {
  if (mode === PAY_PERIOD_MODE.CALENDAR_MONTH) {
    const last = daysInMonth(viewYear, viewMonth);
    const next = addMonths(viewYear, viewMonth, 1);
    const payEff = effectivePaydayDay(
      next.year,
      next.month,
      paydayOfMonth
    );
    return `${viewYear}년 ${viewMonth}월 1일~${last}일 근무 → ${next.year}년 ${next.month}월 ${payEff}일 지급`;
  }

  const payD = effectivePaydayDay(viewYear, viewMonth, paydayOfMonth);
  const prev = addMonths(viewYear, viewMonth, -1);
  const prevPayD = effectivePaydayDay(
    prev.year,
    prev.month,
    paydayOfMonth
  );
  const start = new Date(prev.year, prev.month - 1, prevPayD);
  const end =
    payD <= 1
      ? new Date(viewYear, viewMonth - 1, 0)
      : new Date(viewYear, viewMonth - 1, payD - 1);

  return `${viewYear}년 ${viewMonth}월 ${payD}일 지급: ${fmtShort(start.getFullYear(), start.getMonth() + 1, start.getDate())}~${fmtShort(end.getFullYear(), end.getMonth() + 1, end.getDate())} 근무분`;
}
