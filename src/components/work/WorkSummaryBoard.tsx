"use client";

import { formatWon } from "@/lib/format-money";
import type { MonthSalarySummary } from "@/lib/work-salary-summary";


function formatDurationMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return `${h}시간 ${String(m).padStart(2, "0")}분`;
}

type Props = {
  year: number;
  month: number;
  summary: MonthSalarySummary;
};

export default function WorkSummaryBoard({ year, month, summary }: Props) {
  const title = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "long" }
  );

  return (
    <section
      className="rounded-card bg-card p-5 md:p-7 space-y-6"
      aria-labelledby="work-summary-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2
          id="work-summary-heading"
          className="t5 font-bold text-foreground"
        >
          급여 요약
        </h2>
        <p className="t7 numeric text-fg-tertiary">{title}</p>
      </div>

      <div className="grid sm:grid-cols-2 divide-y divide-divider sm:divide-y-0 sm:divide-x">
        <div className="py-4 sm:py-0 sm:pr-5">
          <p className="t7 text-fg-tertiary mb-1">지급 합계</p>
          <p className="t5 numeric font-bold text-foreground">
            {formatWon(summary.paymentGross)}
          </p>
          <p className="t8 numeric text-fg-tertiary mt-1">
            기본 {formatWon(summary.basePay)} + 주휴 {formatWon(summary.weeklyPay)}
          </p>
        </div>
        <div className="py-4 sm:py-0 sm:pl-5">
          <p className="t7 text-fg-tertiary mb-1">공제 합계</p>
          <p className="t5 numeric font-bold text-negative">
            {formatWon(summary.deductionTax)}
          </p>
          <p className="t8 text-fg-tertiary mt-1">3.3% 세금 (주 단위 산정)</p>
        </div>
      </div>

      <div className="border-t border-divider pt-5">
        <p className="t7 text-fg-tertiary mb-1">최종 실수령액</p>
        <p className="t3 numeric font-bold text-foreground">
          {formatWon(summary.netPay)}
        </p>
      </div>

      <p className="t7 text-center text-fg-tertiary pt-4 border-t border-divider">
        이번 달 총 근무 시간{" "}
        <span className="numeric font-semibold text-foreground">
          {formatDurationMinutes(summary.totalWorkMinutes)}
        </span>
      </p>
    </section>
  );
}
