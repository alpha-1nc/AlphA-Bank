"use client";

import type { MonthSalarySummary } from "@/lib/work-salary-summary";

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

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
      className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8 space-y-6 transition-all duration-300 ease-out md:hover:-translate-y-1 md:hover:shadow-xl max-md:active:scale-[0.99] group/summary"
      aria-labelledby="work-summary-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2
          id="work-summary-heading"
          className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          급여 요약
        </h2>
        <p className="text-base font-bold text-foreground tabular-nums">{title}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100/80 dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-4 py-3.5 transition-colors group-hover/summary:bg-muted/50 dark:group-hover/summary:bg-white/[0.05]">
          <p className="text-xs font-medium text-muted-foreground mb-1">지급 합계</p>
          <p className="text-lg font-black tabular-nums tracking-tight text-foreground">
            {formatKRW(summary.paymentGross)}
          </p>
          <p className="text-[0.7rem] text-muted-foreground mt-1.5 leading-relaxed">
            기본 {formatKRW(summary.basePay)} + 주휴 {formatKRW(summary.weeklyPay)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100/80 dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-4 py-3.5 transition-colors group-hover/summary:bg-muted/50 dark:group-hover/summary:bg-white/[0.05]">
          <p className="text-xs font-medium text-muted-foreground mb-1">공제 합계</p>
          <p className="text-lg font-black tabular-nums tracking-tight text-foreground">
            {formatKRW(summary.deductionTax)}
          </p>
          <p className="text-[0.7rem] text-muted-foreground mt-1.5">3.3% 세금 (주 단위 산정)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/25 bg-primary/5 dark:bg-primary/10 px-5 py-5 transition-colors">
        <p className="text-xs font-semibold text-primary/90 mb-2">최종 실수령액</p>
        <p className="text-3xl md:text-4xl font-black tabular-nums tracking-tighter text-primary">
          {formatKRW(summary.netPay)}
        </p>
      </div>

      <p className="text-center text-sm text-muted-foreground pt-1 border-t border-slate-100 dark:border-white/10">
        이번 달 총 근무 시간{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {formatDurationMinutes(summary.totalWorkMinutes)}
        </span>
      </p>
    </section>
  );
}
