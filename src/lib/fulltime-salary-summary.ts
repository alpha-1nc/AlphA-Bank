import type { WorkRecord } from "@/generated/prisma";
import { formatKstDateKey } from "@/lib/kst-date-key";
import { monthKeyFromDateKey } from "@/lib/kst-week";
import { allowancesFromJsonValue } from "@/lib/workplace-fulltime-json";

export interface FulltimeMonthlySalarySummary {
  grossPay: number;
  taxDeduction: number;
  netPay: number;
}

type WorkplaceForFulltime = {
  monthlyBaseSalary?: number | null;
  allowances?: unknown;
  taxDependents?: number | null;
};

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

/** 간이세액표 근사치 (부양가족 수 기준) */
function estimateIncomeTax(gross: number, dependents: number): number {
  // 단순 근사: 과세표준 × 세율 (3.3% 유사하게, 부양가족 공제 적용)
  const annualGross = gross * 12;
  const deductionPerDependent = 150_000;
  const totalDeduction = dependents * deductionPerDependent;
  const taxableAnnual = Math.max(0, annualGross - totalDeduction);
  let tax = 0;
  if (taxableAnnual <= 12_000_000) {
    tax = taxableAnnual * 0.06;
  } else if (taxableAnnual <= 46_000_000) {
    tax = 720_000 + (taxableAnnual - 12_000_000) * 0.15;
  } else if (taxableAnnual <= 88_000_000) {
    tax = 5_820_000 + (taxableAnnual - 46_000_000) * 0.24;
  } else {
    tax = 15_900_000 + (taxableAnnual - 88_000_000) * 0.35;
  }
  return Math.round(tax / 12);
}

/** 국민연금(4.5%) + 건강보험(3.545%) + 고용보험(0.9%) + 장기요양(건강보험×12.95%) */
function estimateSocialInsurance(gross: number): number {
  const pension = Math.round(gross * 0.045);
  const health = Math.round(gross * 0.03545);
  const longTermCare = Math.round(health * 0.1295);
  const employment = Math.round(gross * 0.009);
  return pension + health + longTermCare + employment;
}

export function computeFulltimeMonthSalarySummary(
  records: WorkRecord[],
  workplace: WorkplaceForFulltime,
  year: number,
  month: number
): FulltimeMonthlySalarySummary {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthRecords = records.filter((r) => {
    const dk = formatKstDateKey(parseDateSafe(r.date));
    return monthKeyFromDateKey(dk) === monthKey;
  });

  const baseSalary = workplace.monthlyBaseSalary ?? 0;
  const allowances = allowancesFromJsonValue(workplace.allowances);
  const dependents = workplace.taxDependents ?? 1;

  // 기본급 + 과세 수당
  const taxableAllowances = allowances
    .filter((a) => !a.isTaxExempt)
    .reduce((s, a) => s + a.amount, 0);
  const nonTaxableAllowances = allowances
    .filter((a) => a.isTaxExempt)
    .reduce((s, a) => s + a.amount, 0);

  // 근무 기록에서 상여·일시금 합산
  const bonusTotal = monthRecords.reduce((s, r) => {
    if (r.bonusAmount != null) return s + r.bonusAmount;
    return s;
  }, 0);
  const taxableBonus = monthRecords.reduce((s, r) => {
    if (r.bonusAmount != null && r.isBonusTaxable !== false) return s + r.bonusAmount;
    return s;
  }, 0);
  const nonTaxableBonus = bonusTotal - taxableBonus;

  const grossTaxable = baseSalary + taxableAllowances + taxableBonus;
  const grossNonTaxable = nonTaxableAllowances + nonTaxableBonus;
  const grossPay = grossTaxable + grossNonTaxable;

  if (grossPay <= 0) {
    return { grossPay: 0, taxDeduction: 0, netPay: 0 };
  }

  const incomeTax = estimateIncomeTax(grossTaxable, dependents);
  const localTax = Math.round(incomeTax * 0.1);
  const socialInsurance = estimateSocialInsurance(grossTaxable);
  const taxDeduction = incomeTax + localTax + socialInsurance;

  return {
    grossPay,
    taxDeduction,
    netPay: Math.max(0, grossPay - taxDeduction),
  };
}
