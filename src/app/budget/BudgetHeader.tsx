"use client";

import { Badge, Top } from "@/components/ui";
import { MonthNav } from "./MonthNav";

/** 월별 예산 상단. md 이상은 Top, md 미만은 월 이동만 (모바일 상단 바에 제목이 있음) */
export function BudgetHeader({ month, periodLabel }: { month: string; periodLabel: string }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        <MonthNav currentMonth={month} className="w-full justify-between" />
        <p className="t7 break-words text-center text-fg-tertiary">통제 기간 {periodLabel}</p>
      </div>
      <Top
        className="hidden px-0 md:block"
        upperGap={0}
        lowerGap={0}
        title={
          <div className="flex min-w-0 items-center gap-2">
            <Top.TitleParagraph size={22}>월별 예산</Top.TitleParagraph>
            <Badge color="grey" variant="weak" size="small">
              {periodLabel}
            </Badge>
          </div>
        }
        subtitleBottom={<Top.SubtitleParagraph size={15}>월간 예산 수립, 집행 추적</Top.SubtitleParagraph>}
        right={<MonthNav currentMonth={month} />}
      />
    </>
  );
}
