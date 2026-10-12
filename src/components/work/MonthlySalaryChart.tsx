"use client";

import { BarChart } from "@/components/ui";
import { formatCompactWon } from "@/lib/format-compact-won";
import type { MonthNetDatum } from "@/lib/work-salary-summary";

type Props = {
  data: MonthNetDatum[];
};

export default function MonthlySalaryChart({ data }: Props) {
  return (
    <section
      className="w-full min-w-0 rounded-card bg-card p-4 md:p-7"
      aria-labelledby="work-chart-heading"
    >
      <h2
        id="work-chart-heading"
        className="t5 font-bold text-foreground mb-6"
      >
        최근 6개월 실수령 추이
      </h2>
      <BarChart
        height={260}
        fill={{ type: "all-bar", theme: "blue" }}
        data={data.map((d) => ({ value: d.net, label: d.monthLabel, barAnnotation: d.net > 0 ? formatCompactWon(d.net) : undefined }))}
      />
    </section>
  );
}
