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

/**
 * 월급일이 지난 뒤에는 달력 기본 월을 다음 달로 맞춤 (KST 기준).
 */
export function getDefaultViewMonth(
  paydayOfMonth: number
): { year: number; month: number } {
  const { y, m, d } = getKstYmd();
  const eff = effectivePaydayDay(y, m, paydayOfMonth);
  if (d > eff) {
    return addMonths(y, m, 1);
  }
  return { year: y, month: m };
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
