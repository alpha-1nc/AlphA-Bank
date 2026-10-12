"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Top } from "@/components/ui";
import WorkplaceSelector from "@/components/work/WorkplaceSelector";
import WorkCalendar from "@/components/work/WorkCalendar";
import WorkRecordModal from "@/components/work/WorkRecordModal";
import WorkSummaryBoard from "@/components/work/WorkSummaryBoard";
import MonthlySalaryChart from "@/components/work/MonthlySalaryChart";
import { getWorkRecordsByDateRange } from "@/actions/workRecord.actions";
import { runWorkBudgetSync } from "@/actions/workBudgetSync.actions";
import { getKstWideFetchRangeUtc } from "@/lib/kst-month-range";
import { formatKstDateKey } from "@/lib/kst-date-key";
import { monthKeyFromDateKey } from "@/lib/kst-week";
import {
  computeMonthSalarySummary,
  computeSixMonthNetSeries,
  ymKey,
} from "@/lib/work-salary-summary";
import {
  getDefaultViewMonth,
  payPeriodCaption,
  PAY_PERIOD_MODE,
  type PayPeriodMode,
} from "@/lib/work-pay-schedule";
import type { Workplace, WorkRecord } from "@/generated/prisma";

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

type Props = {
  initialWorkplaces: Workplace[];
};

export default function WorkBoardClient({ initialWorkplaces }: Props) {
  const [workplaces, setWorkplaces] = useState<Workplace[]>(initialWorkplaces);

  useEffect(() => {
    setWorkplaces(initialWorkplaces);
  }, [initialWorkplaces]);

  /** 예산 수입 동기화는 Server Action에서만 수행 (SSR에서 revalidatePath 금지·청크 오류 방지) */
  useEffect(() => {
    void runWorkBudgetSync();
  }, []);
  const active = useMemo(
    () => workplaces.filter((w) => w.isActive),
    [workplaces]
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => active[0]?.id ?? null
  );

  /** 사용자가 ◀▶로 월을 바꾼 뒤에는 자동 월 보정을 잠시 끔 */
  const monthPinnedRef = useRef(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [wideRecords, setWideRecords] = useState<WorkRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState<Date | null>(null);
  /** 열 때마다 증가 — 같은 날짜를 다시 열어도 시트가 새로 마운트되어 입력값이 초기화됨 */
  const [modalSeq, setModalSeq] = useState(0);

  const selected = useMemo(
    () => active.find((w) => w.id === selectedId) ?? null,
    [active, selectedId]
  );

  useEffect(() => {
    if (active.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !active.some((w) => w.id === selectedId)) {
      setSelectedId(active[0].id);
    }
  }, [active, selectedId]);

  useEffect(() => {
    if (!selected) return;
    monthPinnedRef.current = false;
    const { year: y, month: m } = getDefaultViewMonth(selected.paydayOfMonth);
    setYear(y);
    setMonth(m);
  }, [selectedId]);

  useEffect(() => {
    if (!selected || monthPinnedRef.current) return;
    const { year: y, month: m } = getDefaultViewMonth(selected.paydayOfMonth);
    setYear(y);
    setMonth(m);
  }, [selected?.paydayOfMonth, selected?.payPeriodMode]);

  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => {
      if (monthPinnedRef.current) return;
      const { year: y, month: m } = getDefaultViewMonth(selected.paydayOfMonth);
      setYear((cy) => (cy !== y ? y : cy));
      setMonth((cm) => (cm !== m ? m : cm));
    }, 60_000);
    return () => clearInterval(id);
  }, [selected, selected?.paydayOfMonth]);

  const refreshRecords = useCallback(async () => {
    if (!selectedId) {
      setWideRecords([]);
      return;
    }
    setLoadError(null);
    const { start, end } = getKstWideFetchRangeUtc(year, month);
    const res = await getWorkRecordsByDateRange(selectedId, start, end);
    if (res.success) {
      setWideRecords(res.data);
    } else {
      setLoadError(res.error);
      setWideRecords([]);
    }
  }, [selectedId, year, month]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  const calendarRecords = useMemo(() => {
    const key = ymKey(year, month);
    return wideRecords.filter(
      (r) => monthKeyFromDateKey(formatKstDateKey(parseDateSafe(r.date))) === key
    );
  }, [wideRecords, year, month]);

  const summaryPart = useMemo(
    () => computeMonthSalarySummary(wideRecords, year, month),
    [wideRecords, year, month]
  );

  const chartSeries = useMemo(() => {
    if (!selected) return [];
    return computeSixMonthNetSeries(wideRecords, year, month);
  }, [wideRecords, year, month, selected]);

  const recordsOnModalDay = useMemo(() => {
    if (!modalDay) return [];
    const key = formatKstDateKey(modalDay);
    return calendarRecords.filter(
      (r) => formatKstDateKey(parseDateSafe(r.date)) === key
    );
  }, [modalDay, calendarRecords]);

  function handlePrevMonth() {
    monthPinnedRef.current = true;
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }

  function handleNextMonth() {
    monthPinnedRef.current = true;
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }

  function handleJumpToMonth(y: number, m: number) {
    monthPinnedRef.current = true;
    setYear(y);
    setMonth(m);
  }

  function handleDayClick(day: Date) {
    setModalDay(day);
    setModalSeq((n) => n + 1);
    setModalOpen(true);
  }

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      {/* md 미만은 모바일 상단 바에 제목이 있어 Top 을 렌더하지 않는다 (월 이동은 캘린더 헤더) */}
      <Top
        className="hidden px-0 md:block"
        upperGap={0}
        lowerGap={0}
        title={
          <div className="flex min-w-0 items-center gap-2">
            <Top.TitleParagraph size={22}>급여 계산기</Top.TitleParagraph>
            {selected && (
              <Badge color="grey" variant="weak" size="small">
                {selected.name}
              </Badge>
            )}
          </div>
        }
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            근무지별 시급·근무 기록으로 실수령액과 월별 추이를 확인합니다
          </Top.SubtitleParagraph>
        }
      />

      <WorkplaceSelector
        workplaces={workplaces}
        selectedId={selectedId}
        onSelect={(id) => {
          monthPinnedRef.current = false;
          setSelectedId(id);
        }}
        onWorkplaceCreated={(w) => {
          setWorkplaces((prev) => [...prev, w]);
          setSelectedId(w.id);
        }}
      />

      {loadError && (
        <p
          className="t7 text-negative rounded-control bg-divider px-4 py-3 animate-in fade-in zoom-in-95 duration-300"
          role="alert"
        >
          {loadError}
        </p>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
            <WorkSummaryBoard year={year} month={month} summary={summaryPart} />
            <MonthlySalaryChart data={chartSeries} />
          </div>

          <WorkCalendar
            year={year}
            month={month}
            records={calendarRecords}
            paydayOfMonth={selected.paydayOfMonth}
            payPeriodCaption={payPeriodCaption(
              year,
              month,
              selected.paydayOfMonth,
              (selected.payPeriodMode === PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
                ? PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
                : PAY_PERIOD_MODE.CALENDAR_MONTH) as PayPeriodMode
            )}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayClick={handleDayClick}
            onJumpToMonth={handleJumpToMonth}
          />

          {modalDay && (
            <WorkRecordModal
              key={`${selected.id}-${formatKstDateKey(modalDay)}-${modalSeq}`}
              open={modalOpen}
              onOpenChange={setModalOpen}
              workplaceId={selected.id}
              payroll={{
                hourlyWage: selected.hourlyWage,
                isWeeklyAllowanceActive: selected.isWeeklyAllowanceActive,
                isTaxActive: selected.isTaxActive,
              }}
              selectedDate={modalDay}
              viewYear={year}
              viewMonth={month}
              recordsOnDay={recordsOnModalDay}
              onSuccess={() => void refreshRecords()}
            />
          )}
        </>
      )}
    </div>
  );
}
