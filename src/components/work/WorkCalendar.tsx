"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { cn } from "@/lib/utils";
import { formatKstDateKey } from "@/lib/kst-date-key";
import { effectivePaydayDay } from "@/lib/work-pay-schedule";
import { calculateDailyBasePay, getGrossWorkMinutes } from "@/utils/calculator";
import type { WorkRecord } from "@/generated/prisma";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}월`,
}));

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

function buildDayStats(
  records: WorkRecord[]
): Map<string, { totalMinutes: number; totalPay: number }> {
  const map = new Map<string, { totalMinutes: number; totalPay: number }>();
  for (const r of records) {
    const dk = formatKstDateKey(parseDateSafe(r.date));
    const start = parseDateSafe(r.startTime);
    const end = parseDateSafe(r.endTime);
    const gross = getGrossWorkMinutes({
      startTime: start,
      endTime: end,
      breakTimeMinutes: r.breakTimeMinutes ?? 0,
    });
    const base = calculateDailyBasePay({
      startTime: start,
      endTime: end,
      breakTimeMinutes: r.breakTimeMinutes ?? 0,
      hourlyWage: r.hourlyWage,
    });
    const prev = map.get(dk) ?? {
      totalMinutes: 0,
      totalPay: 0,
    };
    prev.totalMinutes += gross;
    prev.totalPay += base;
    map.set(dk, prev);
  }
  return map;
}

type Props = {
  year: number;
  month: number;
  records: WorkRecord[];
  paydayOfMonth: number;
  payPeriodCaption: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: Date) => void;
  /** 예산 화면과 같은 월·연도 빠른 이동 */
  onJumpToMonth?: (year: number, month: number) => void;
};

export default function WorkCalendar({
  year,
  month,
  records,
  paydayOfMonth,
  payPeriodCaption,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onJumpToMonth,
}: Props) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearInput, setYearInput] = useState(String(year));
  const [monthInput, setMonthInput] = useState(String(month).padStart(2, "0"));
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setYearInput(String(year));
    setMonthInput(String(month).padStart(2, "0"));
  }, [year, month]);

  useEffect(() => {
    if (monthPickerOpen) {
      yearInputRef.current?.focus();
    }
  }, [monthPickerOpen]);

  useEffect(() => {
    if (!monthPickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMonthPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [monthPickerOpen]);

  function applyMonthJump() {
    const y = Number(yearInput);
    const m = parseInt(monthInput, 10);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
      onJumpToMonth?.(y, m);
      setMonthPickerOpen(false);
    }
  }

  const effPayday = useMemo(
    () => effectivePaydayDay(year, month, paydayOfMonth),
    [year, month, paydayOfMonth]
  );

  const stats = useMemo(
    () => buildDayStats(records),
    [records]
  );

  const todayKey = formatKstDateKey(new Date());

  const { cells, label } = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const title = first.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });

    const out: {
      key: string;
      date: Date | null;
      inMonth: boolean;
    }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      out.push({ key: `pad-${i}`, date: null, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      out.push({
        key: formatKstDateKey(date),
        date,
        inMonth: true,
      });
    }
    while (out.length % 7 !== 0) {
      out.push({ key: `trail-${out.length}`, date: null, inMonth: false });
    }

    return { cells: out, label: title };
  }, [year, month]);

  return (
    <div className="rounded-card bg-card p-3 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-stretch justify-between gap-2 sm:gap-3 mb-6 p-2 sm:p-3 rounded-control bg-background">
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onPrevMonth}
          className="h-11 w-11 px-0 rounded-control shrink-0 border-0 bg-card text-fg-secondary hover:bg-accent-soft hover:text-primary transition-all active:scale-95 touch-manipulation"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="relative flex-1 flex items-center justify-center min-w-0">
          {onJumpToMonth ? (
            <>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMonthPickerOpen((o) => !o)}
                className={cn(
                  "t5 numeric flex items-center justify-center gap-1 font-bold text-foreground py-2 px-2 sm:px-3 rounded-control transition-all min-w-0 max-w-full",
                  "hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]"
                )}
              >
                <span className="truncate">{label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-fg-tertiary transition-transform duration-200",
                    monthPickerOpen && "rotate-180"
                  )}
                />
              </button>
              {monthPickerOpen && (
                <div
                  ref={panelRef}
                  className="absolute left-1/2 top-full z-50 mt-2 w-[min(100%,220px)] -translate-x-1/2 rounded-control border border-divider bg-card p-4 animate-in fade-in-0 zoom-in-95"
                  onKeyDown={(e) => e.key === "Enter" && applyMonthJump()}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="t7 font-medium text-fg-tertiary shrink-0">
                        연도
                      </label>
                      <Input
                        ref={yearInputRef}
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        value={yearInput}
                        onChange={(e) => setYearInput(e.target.value)}
                        className="t7 h-8 rounded-control"
                        placeholder="2026"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="t7 font-medium text-fg-tertiary shrink-0">
                        월
                      </label>
                      <ResponsiveSelect
                        value={monthInput}
                        onValueChange={(v) => v && setMonthInput(v)}
                        options={MONTHS.map((mo) => ({ value: mo.value, label: mo.label }))}
                        placeholder="월 선택"
                        size="sm"
                        triggerClassName="t7 h-8 flex-1 rounded-control"
                      />
                    </div>
                    <Button size="sm" className="w-full rounded-control bg-primary text-primary-foreground" onClick={applyMonthJump}>
                      해당 월로 이동
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <h2 className="t5 numeric font-bold text-foreground text-center truncate px-1">
              {label}
            </h2>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onNextMonth}
          className="h-11 w-11 px-0 rounded-control shrink-0 border-0 bg-card text-fg-secondary hover:bg-accent-soft hover:text-primary transition-all active:scale-95 touch-manipulation"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="t8 text-fg-tertiary text-center px-1 mb-5">
        {payPeriodCaption}
      </p>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
        {WEEK_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "t7 font-medium py-1 sm:py-2",
              // 일·토만 색 구분 유지 (날짜 인식용)
              i === 0 ? "text-negative" : i === 6 ? "text-primary" : "text-fg-tertiary"
            )}
          >
            {w}
          </div>
        ))}

        {cells.map((cell) => {
          if (!cell.date) {
            return (
              <div
                key={cell.key}
                className="min-h-[3.5rem] sm:min-h-[5.25rem]"
              />
            );
          }

          const dk = cell.key;
          const s = stats.get(dk);
          const isToday = dk === todayKey;
          const dayNum = cell.date.getDate();
          const isPayday = dayNum === effPayday;
          const nSameDay = records.filter(
            (r) => formatKstDateKey(parseDateSafe(r.date)) === dk
          ).length;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onDayClick(cell.date!)}
              className={cn(
                "relative group flex min-h-[3.5rem] sm:min-h-[5.25rem] flex-col rounded-control border bg-card p-1 sm:p-2 text-left transition-all duration-200 touch-manipulation select-none",
                "md:hover:bg-accent-soft active:scale-[0.98]",
                isToday ? "border-primary" : "border-divider"
              )}
            >
              <span className="flex items-start justify-between gap-1 w-full">
                <span
                  className={cn(
                    "t7 numeric font-bold",
                    isToday ? "text-primary" : "text-foreground"
                  )}
                >
                  {dayNum}
                </span>
                {isPayday && (
                  <>
                    <span
                      className="t9 hidden sm:inline-flex shrink-0 rounded-pill bg-primary px-1 py-0.5 font-bold text-primary-foreground leading-none"
                      aria-hidden
                    >
                      월급
                    </span>
                    <span
                      className="sm:hidden h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      title="월급일"
                      aria-label="월급일"
                    />
                  </>
                )}
              </span>

              {s && s.totalMinutes > 0 && (
                <div className="mt-auto flex flex-col gap-1 items-center sm:items-stretch">
                  <span
                    className="t9 numeric hidden sm:inline-flex max-w-full items-center justify-center rounded-pill bg-accent-soft px-1 py-0.5 font-semibold text-primary leading-none truncate"
                  >
                    {(s.totalMinutes / 60).toFixed(1)}h
                  </span>
                  <span
                    className="sm:hidden h-2 w-2 rounded-full shrink-0 bg-primary"
                    title={`${(s.totalMinutes / 60).toFixed(1)}시간 · ${s.totalPay.toLocaleString("ko-KR")}원`}
                    aria-hidden
                  />
                  <span
                    className="t8 numeric hidden sm:inline text-fg-tertiary truncate text-center"
                    title={`예상 일급 ${s.totalPay.toLocaleString("ko-KR")}원`}
                  >
                    {s.totalPay >= 10000
                      ? `${(s.totalPay / 10000).toFixed(1)}만`
                      : `${s.totalPay.toLocaleString()}원`}
                  </span>
                </div>
              )}

              {nSameDay > 1 && (
                <span
                  className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-3 min-w-3 sm:h-4 sm:min-w-4 items-center justify-center rounded-full bg-primary px-0.5 sm:px-1 text-[0.5rem] sm:text-[0.55rem] font-bold text-primary-foreground"
                  title={`같은 날 근무 ${nSameDay}건`}
                >
                  {nSameDay}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
