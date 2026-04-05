import type { WorkRecord } from "@/generated/prisma";
import { formatKstDateKey } from "@/lib/kst-date-key";
import {
  getKstMondayKeyFromDateKey,
  getKstSundayKeyFromMondayKey,
  monthKeyFromDateKey,
} from "@/lib/kst-week";
import {
  calculateDailyBasePay,
  calculateTaxDeduction,
  calculateWeeklyAllowanceForWeek,
  getGrossWorkMinutesOptional,
  type WorkRecordForWeeklyAllowance,
} from "@/utils/calculator";

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

export function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toWeeklyCalc(r: WorkRecord): WorkRecordForWeeklyAllowance | null {
  if (r.startTime == null || r.endTime == null) return null;
  return {
    startTime: parseDateSafe(r.startTime),
    endTime: parseDateSafe(r.endTime),
    breakTimeMinutes: r.breakTimeMinutes ?? 0,
    hourlyWage: r.hourlyWage,
    isWeeklyAllowanceActive: r.isWeeklyAllowanceActive,
  };
}

export type MonthSalarySummary = {
  /** 기본 근무 수당 (해당 월 근무일에 속한 레코드) */
  basePay: number;
  /** 주휴수당 (해당 주 일요일이 이 달에 속하는 주에만 합산) */
  weeklyPay: number;
  /** 지급 합계 = base + weekly */
  paymentGross: number;
  /** 3.3% 세금 (주 단위로 산출 후 일요일이 이 달에 속하는 주의 세액 합산) */
  deductionTax: number;
  netPay: number;
  totalWorkMinutes: number;
};

/**
 * 주휴·세금은 '해당 주 일요일(KST)이 속한 월'에 합산합니다.
 * 일일 기본·근무시간은 근무일(date)이 속한 월에 합산합니다.
 */
export function computeMonthSalarySummary(
  records: WorkRecord[],
  year: number,
  month: number
): MonthSalarySummary {
  const tKey = ymKey(year, month);

  let basePay = 0;
  let totalWorkMinutes = 0;

  for (const r of records) {
    const dk = formatKstDateKey(parseDateSafe(r.date));
    if (monthKeyFromDateKey(dk) !== tKey) continue;

    if (r.startTime == null || r.endTime == null) continue;

    const start = parseDateSafe(r.startTime);
    const end = parseDateSafe(r.endTime);
    basePay += calculateDailyBasePay({
      startTime: start,
      endTime: end,
      breakTimeMinutes: r.breakTimeMinutes ?? 0,
      hourlyWage: r.hourlyWage,
    });
    totalWorkMinutes += getGrossWorkMinutesOptional({
      startTime: start,
      endTime: end,
      breakTimeMinutes: r.breakTimeMinutes,
    });
  }

  const byMonday = new Map<string, WorkRecord[]>();
  for (const r of records) {
    const dk = formatKstDateKey(parseDateSafe(r.date));
    const mon = getKstMondayKeyFromDateKey(dk);
    const arr = byMonday.get(mon) ?? [];
    arr.push(r);
    byMonday.set(mon, arr);
  }

  let weeklyPay = 0;
  let deductionTax = 0;

  for (const [mondayKey, weekRecords] of Array.from(byMonday.entries())) {
    const uniq = new Map<string, WorkRecord>();
    for (const r of weekRecords) {
      uniq.set(r.id, r);
    }
    const list = Array.from(uniq.values());
    const calc = list
      .map(toWeeklyCalc)
      .filter((x): x is WorkRecordForWeeklyAllowance => x != null);
    const wAllow = calculateWeeklyAllowanceForWeek(calc);
    let baseWeek = 0;
    for (const r of list) {
      if (r.startTime == null || r.endTime == null) continue;
      baseWeek += calculateDailyBasePay({
        startTime: parseDateSafe(r.startTime),
        endTime: parseDateSafe(r.endTime),
        breakTimeMinutes: r.breakTimeMinutes ?? 0,
        hourlyWage: r.hourlyWage,
      });
    }
    const tax = calculateTaxDeduction({
      baseTotal: baseWeek,
      weeklyAllowanceTotal: wAllow,
      isTaxActive: list.some((r) => r.isTaxActive),
    });

    const sundayKey = getKstSundayKeyFromMondayKey(mondayKey);
    const sundayMonth = monthKeyFromDateKey(sundayKey);

    if (sundayMonth === tKey) {
      weeklyPay += wAllow;
      deductionTax += tax;
    }
  }

  const paymentGross = basePay + weeklyPay;
  const netPay = paymentGross - deductionTax;

  return {
    basePay,
    weeklyPay,
    paymentGross,
    deductionTax,
    netPay,
    totalWorkMinutes,
  };
}

export type MonthNetDatum = {
  yearMonth: string;
  monthLabel: string;
  fullLabel: string;
  net: number;
  minutes: number;
};

function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

/** 차트용: 선택 월을 끝으로 하는 최근 6개월 각각의 실수령·총 근무분 */
export function computeSixMonthNetSeries(
  records: WorkRecord[],
  endYear: number,
  endMonth: number
): MonthNetDatum[] {
  const out: MonthNetDatum[] = [];
  for (let i = -5; i <= 0; i++) {
    const { y, m } = addMonths(endYear, endMonth, i);
    const s = computeMonthSalarySummary(records, y, m);
    const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(
      "ko-KR",
      { month: "short" }
    );
    const fullLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(
      "ko-KR",
      { year: "numeric", month: "long" }
    );
    out.push({
      yearMonth: ymKey(y, m),
      monthLabel,
      fullLabel,
      net: s.netPay,
      minutes: s.totalWorkMinutes,
    });
  }
  return out;
}
