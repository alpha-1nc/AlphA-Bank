/**
 * 아르바이트 급여 계산 유틸리티 (순수 함수).
 * 모든 금액은 원 단위로 Math.floor 처리합니다.
 */

/** 금액 계산 공통: 소수점 이하 버림 */
function floorMoney(value: number): number {
  return Math.floor(value);
}

/** 근무 1건에서 실근로 시간(분): (종료−시작) 분 − 휴게 분, 음수는 0으로 처리 */
export function getGrossWorkMinutes(input: {
  startTime: Date;
  endTime: Date;
  breakTimeMinutes: number;
}): number {
  const diffMs = input.endTime.getTime() - input.startTime.getTime();
  const minutes = diffMs / 60_000 - input.breakTimeMinutes;
  return Math.max(0, minutes);
}

/** 시작·종료가 없으면 0 (정규직 추가만 기록 등) */
export function getGrossWorkMinutesOptional(input: {
  startTime: Date | null | undefined;
  endTime: Date | null | undefined;
  breakTimeMinutes: number | null | undefined;
}): number {
  if (input.startTime == null || input.endTime == null) return 0;
  return getGrossWorkMinutes({
    startTime: input.startTime,
    endTime: input.endTime,
    breakTimeMinutes: input.breakTimeMinutes ?? 0,
  });
}

export type DailyBasePayInput = {
  startTime: Date;
  endTime: Date;
  breakTimeMinutes: number;
  hourlyWage: number;
};

/**
 * A. 일일 기본 수당
 * 산식: floor( (실근로 분 / 60) × 시급 )
 * 실근로 분 = (종료시간 − 시작시간)을 분으로 환산한 값 − 휴게시간(분)
 */
export function calculateDailyBasePay(input: DailyBasePayInput): number {
  const grossMinutes = getGrossWorkMinutes(input);
  return floorMoney((grossMinutes / 60) * input.hourlyWage);
}

/** 주휴수당 계산에 쓰는 근무 기록 (해당 주에 속한 레코드만 넘길 것) */
export type WorkRecordForWeeklyAllowance = {
  startTime: Date;
  endTime: Date;
  breakTimeMinutes: number;
  hourlyWage: number;
  isWeeklyAllowanceActive: boolean;
};

/**
 * B. 주휴수당 (특정 1주 구간의 WorkRecord 배열 기준)
 *
 * - `isWeeklyAllowanceActive === false` 인 근무: 주휴 산정에 넣지 않습니다(해당 건은 15·40시간 조건 검사 대상에서 제외 = 그 분은 0으로 취급).
 * - `true` 인 근무만 모아 총 근로 분(totalMinutes)과 가중 시급을 계산한 뒤, 아래 구간식을 적용합니다.
 * - (만약 “한 주에 false 근무가 하나라도 있으면 주휴 전체 0” 규칙이 필요하면, 호출 전에
 *   `records.some((r) => !r.isWeeklyAllowanceActive)` 로 분기하세요.)
 *
 * 총 근로 분이 900분(15시간) 미만 → 0원.
 * 900분 이상 2400분(40시간) 미만:
 *   floor( (총근로분 / 2400) × 8 × 시급가중 )
 *   ※ (1주 총 근로시간 / 40시간) × 8시간 × 시급 = (총근로분/60 / 40) × 8 × 시급 = (총근로분/2400) × 8 × 시급
 * 2400분 이상:
 *   floor( 8 × 시급가중 )  (상한)
 *
 * 시급가중: 포함된 레코드들에 대해 (분_i × 시급_i) 합 / 총 분 (가중 평균 시급)
 */
export function calculateWeeklyAllowanceForWeek(
  recordsInWeek: WorkRecordForWeeklyAllowance[]
): number {
  const included = recordsInWeek.filter((r) => r.isWeeklyAllowanceActive);
  if (included.length === 0) {
    return 0;
  }

  let totalMinutes = 0;
  let weightedWageNumerator = 0;

  for (const r of included) {
    const mins = getGrossWorkMinutes(r);
    if (mins <= 0) {
      continue;
    }
    totalMinutes += mins;
    weightedWageNumerator += mins * r.hourlyWage;
  }

  if (totalMinutes < 900) {
    return 0;
  }

  const hourlyWageWeighted = weightedWageNumerator / totalMinutes;

  if (totalMinutes >= 2400) {
    return floorMoney(8 * hourlyWageWeighted);
  }

  return floorMoney((totalMinutes / 2400) * 8 * hourlyWageWeighted);
}

export type TaxDeductionInput = {
  /** 기본 수당 합계(일일 기본 수당들의 합 등) */
  baseTotal: number;
  /** 주휴수당 합계 */
  weeklyAllowanceTotal: number;
  /** 3.3% 세금 적용 여부(수동). false면 세액 0 */
  isTaxActive: boolean;
};

/**
 * C. 3.3% 세금 공제
 * - isTaxActive === false → 0원
 * - true → floor( (기본 수당 총합 + 주휴수당 총합) × 0.033 )
 *
 * 스키마에 레코드별 isTaxActive가 있을 때, 급여 기간 전체에 세금을 한 번 적용할지 여부는
 * 호출 측에서 합의된 하나의 boolean(예: 기간 내 한 건이라도 적용이면 true 등)으로 넘기면 됩니다.
 */
export function calculateTaxDeduction(input: TaxDeductionInput): number {
  if (!input.isTaxActive) {
    return 0;
  }
  return floorMoney((input.baseTotal + input.weeklyAllowanceTotal) * 0.033);
}

/** ISO 기준: 월요일 00:00:00.000 (로컬 타임존) */
export function getMondayOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=일 … 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diffToMonday);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** `date`가 속한 ISO 주(월~일)에 해당하는지 여부 (로컬 기준) */
export function isDateInSameWeek(a: Date, b: Date): boolean {
  return getMondayOfWeek(a).getTime() === getMondayOfWeek(b).getTime();
}
