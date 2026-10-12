import { formatWon } from "@/lib/format-money";

type Props = {
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  livingBalance: number;
  /** 저축률(%). 수입이 0이면 null → "-" */
  savingRate: number | null;
  /** 예산 기간 (예: "9월 5일 ~ 10월 4일") */
  periodLabel: string;
};

export default function MonthSummary({
  totalIncome,
  totalExpense,
  totalSaving,
  livingBalance,
  savingRate,
  periodLabel,
}: Props) {
  // 수입 대비 비율. 0보다 크면 최소 2%, 정확히 0이면 그리지 않음.
  // 합이 100%를 넘으면 비율대로 줄여 막대를 꽉 채우고 넘치지 않게 한다.
  const MIN_PCT = 2;
  const rawPct = (v: number) => {
    if (v <= 0) return 0;
    if (totalIncome <= 0) return 100; // 수입 없이 지출·저축만 있으면 꽉 참
    return (v / totalIncome) * 100;
  };
  let expensePct = totalExpense > 0 ? Math.max(MIN_PCT, rawPct(totalExpense)) : 0;
  let savingPct = totalSaving > 0 ? Math.max(MIN_PCT, rawPct(totalSaving)) : 0;
  const used = expensePct + savingPct;
  if (used > 100) {
    expensePct = (expensePct / used) * 100;
    savingPct = (savingPct / used) * 100;
  }
  /** 막대의 남은 영역 = 수입 대비 남은 생활비 비율 (수입이 0이면 null) */
  const remainingPct = totalIncome > 0 ? Math.max(0, (livingBalance / totalIncome) * 100) : null;

  const rows = [
    { label: "수입", value: totalIncome, dot: "bg-primary" },
    { label: "예상 지출", value: totalExpense, dot: "bg-negative" },
    { label: "저축·투자", value: totalSaving, dot: "bg-positive" },
  ];

  return (
    <div className="flex flex-col rounded-card bg-card px-6 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="t5 font-bold text-foreground">이번 달 예산</p>
        <p className="t7 shrink-0 text-fg-tertiary">{periodLabel}</p>
      </div>

      <p className="t7 mt-4 text-fg-tertiary">쓸 수 있는 생활비</p>
      <p className="numeric t2 font-bold text-foreground">
        {formatWon(livingBalance)}
      </p>

      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-[4px] bg-divider">
        <div className="h-full bg-negative" style={{ width: `${expensePct}%` }} />
        <div className="h-full bg-positive" style={{ width: `${savingPct}%` }} />
      </div>
      <p className="st12 numeric mt-2 text-right text-fg-tertiary">
        남은 생활비 {remainingPct === null ? "-" : `${remainingPct.toFixed(1)}%`}
      </p>

      <div className="mt-3 divide-y divide-divider">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 py-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${r.dot}`} aria-hidden />
            <span className="t6 flex-1 text-fg-secondary">{r.label}</span>
            <div className="text-right">
              <p className="t6 numeric font-bold text-foreground">{formatWon(r.value)}</p>
              {/* 저축률은 금액 아래 줄. 다른 행도 같은 높이가 되도록 빈 줄을 둔다 */}
              <p
                className={`st12 numeric text-fg-tertiary ${r.label === "저축·투자" ? "" : "invisible"}`}
                aria-hidden={r.label !== "저축·투자"}
              >
                저축률 {savingRate === null ? "-" : `${savingRate.toFixed(1)}%`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
