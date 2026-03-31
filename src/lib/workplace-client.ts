import type { Workplace } from "@/generated/prisma";
import { normalizePayPeriodMode } from "@/lib/work-pay-schedule";

/** Prisma `Workplace` 스키마 기본값과 동일 */
export const WORKPLACE_DEFAULTS = {
  hourlyWage: 10030,
  isWeeklyAllowanceActive: true,
  isTaxActive: true,
  isActive: true,
  paydayOfMonth: 10,
  payPeriodMode: "CALENDAR_MONTH",
} as const;

/**
 * 서버→클라이언트 직렬화·레거시 DB NULL 등으로 빠질 수 있는 필드를 보정합니다.
 * DB/액션 결과를 UI에 넘기기 전에 호출하는 것을 권장합니다.
 */
export function normalizeWorkplaceForClient(w: Workplace): Workplace {
  return {
    ...w,
    hourlyWage: w.hourlyWage ?? WORKPLACE_DEFAULTS.hourlyWage,
    isWeeklyAllowanceActive:
      w.isWeeklyAllowanceActive ?? WORKPLACE_DEFAULTS.isWeeklyAllowanceActive,
    isTaxActive: w.isTaxActive ?? WORKPLACE_DEFAULTS.isTaxActive,
    isActive: w.isActive ?? WORKPLACE_DEFAULTS.isActive,
    paydayOfMonth: w.paydayOfMonth ?? WORKPLACE_DEFAULTS.paydayOfMonth,
    payPeriodMode: normalizePayPeriodMode(
      w.payPeriodMode ?? WORKPLACE_DEFAULTS.payPeriodMode
    ),
  };
}

export function normalizeWorkplacesForClient(list: Workplace[]): Workplace[] {
  return list.map(normalizeWorkplaceForClient);
}
