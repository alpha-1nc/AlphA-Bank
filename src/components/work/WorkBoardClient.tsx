"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase } from "lucide-react";
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
    setModalOpen(true);
  }

  return (
    <div className="px-4 py-6 md:p-8 lg:p-10 space-y-8 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden transition-opacity duration-300">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2.5 min-w-0">
            <Briefcase className="h-8 w-8 text-primary shrink-0 transition-transform duration-300 md:hover:scale-105" />
            <span className="break-words">급여 계산기</span>
          </h1>
          <p className="hidden md:block text-sm text-slate-400 font-medium">
            근무지별 시급·근무 기록으로 실수령액과 월별 추이를 확인합니다
          </p>
        </div>
      </header>

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
          className="text-sm text-destructive rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in zoom-in-95 duration-300"
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
            workplaceColor={selected.color}
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

          {modalOpen && modalDay && (
            <WorkRecordModal
              key={`${selected.id}-${formatKstDateKey(modalDay)}`}
              open={modalOpen}
              onOpenChange={(o) => {
                setModalOpen(o);
                if (!o) setModalDay(null);
              }}
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
