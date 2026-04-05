"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  records: WorkRecord[],
  workplaceColor: string
): Map<string, { totalMinutes: number; totalPay: number; color: string }> {
  const map = new Map<
    string,
    { totalMinutes: number; totalPay: number; color: string }
  >();
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
      color: workplaceColor,
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
  workplaceColor: string;
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
  workplaceColor,
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
    () => buildDayStats(records, workplaceColor),
    [records, workplaceColor]
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
    <div className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] p-3 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out md:hover:-translate-y-1 md:hover:shadow-xl max-md:active:scale-[0.99] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-stretch justify-between gap-2 sm:gap-3 mb-6 p-2 sm:p-3 rounded-2xl border border-slate-100/80 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevMonth}
          className="rounded-2xl shrink-0 border-slate-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="relative flex-1 flex items-center justify-center min-w-0">
          {onJumpToMonth ? (
            <>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMonthPickerOpen((o) => !o)}
                className={cn(
                  "flex items-center justify-center gap-1 sm:gap-1.5 text-base sm:text-lg font-black tracking-tighter text-slate-900 dark:text-slate-100 py-1.5 px-2 sm:px-3 rounded-2xl transition-all min-w-0 max-w-full",
                  "hover:bg-white/80 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]"
                )}
              >
                <span className="truncate">{label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                    monthPickerOpen && "rotate-180"
                  )}
                />
              </button>
              {monthPickerOpen && (
                <div
                  ref={panelRef}
                  className="absolute left-1/2 top-full z-50 mt-2 w-[min(100%,220px)] -translate-x-1/2 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 animate-in fade-in-0 zoom-in-95"
                  onKeyDown={(e) => e.key === "Enter" && applyMonthJump()}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-muted-foreground shrink-0">
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
                        className="h-8 text-sm"
                        placeholder="2026"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-muted-foreground shrink-0">
                        월
                      </label>
                      <Select
                        value={monthInput}
                        onValueChange={(v) => v && setMonthInput(v)}
                      >
                        <SelectTrigger size="sm" className="h-8 flex-1">
                          <SelectValue placeholder="월 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((mo) => (
                            <SelectItem key={mo.value} value={mo.value}>
                              {mo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="w-full rounded-xl" onClick={applyMonthJump}>
                      해당 월로 이동
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground text-center truncate px-1">
              {label}
            </h2>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNextMonth}
          className="rounded-2xl shrink-0 border-slate-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-[0.7rem] sm:text-xs text-muted-foreground text-center leading-relaxed px-1 mb-5">
        {payPeriodCaption}
      </p>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 text-center">
        {WEEK_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "text-[0.6rem] sm:text-xs font-semibold uppercase tracking-wider py-1 sm:py-2",
              i === 0 && "text-rose-500/90",
              i === 6 && "text-primary/90"
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
                className="min-h-[2.75rem] sm:min-h-[5.25rem] rounded-xl sm:rounded-2xl bg-muted/20 dark:bg-white/[0.02]"
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
                "relative group flex min-h-[2.75rem] sm:min-h-[5.25rem] flex-col rounded-xl sm:rounded-2xl border p-1 sm:p-2 text-left transition-all duration-200 touch-manipulation select-none",
                "border-slate-100/80 dark:border-white/10 md:hover:border-primary/40 md:hover:bg-primary/5 md:hover:shadow-sm dark:md:hover:bg-white/5 active:scale-[0.98]",
                isToday &&
                  "ring-2 ring-primary/40 ring-offset-2 ring-offset-background dark:ring-offset-[#18181B]",
                isPayday &&
                  "border-amber-300/80 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/10"
              )}
            >
              <span className="flex items-start justify-between gap-1 w-full">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-semibold tabular-nums",
                    isToday ? "text-primary" : "text-foreground"
                  )}
                >
                  {dayNum}
                </span>
                {isPayday && (
                  <>
                    <span
                      className="hidden sm:inline-flex shrink-0 rounded-md bg-amber-500/90 px-1 py-0.5 text-[0.55rem] font-bold text-white leading-none"
                      aria-hidden
                    >
                      월급
                    </span>
                    <span
                      className="sm:hidden h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40"
                      title="월급일"
                      aria-label="월급일"
                    />
                  </>
                )}
              </span>

              {s && s.totalMinutes > 0 && (
                <div className="mt-auto flex flex-col gap-0.5 sm:gap-0.5 items-center sm:items-stretch">
                  <span
                    className="hidden sm:inline-flex max-w-full items-center justify-center rounded-md px-1 py-0.5 text-[0.65rem] font-semibold tabular-nums leading-none truncate border border-transparent"
                    style={{
                      backgroundColor: `${s.color}22`,
                      color: s.color,
                      borderColor: `${s.color}44`,
                    }}
                  >
                    {(s.totalMinutes / 60).toFixed(1)}h
                  </span>
                  <span
                    className="sm:hidden h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                    title={`${(s.totalMinutes / 60).toFixed(1)}시간 · ${s.totalPay.toLocaleString("ko-KR")}원`}
                    aria-hidden
                  />
                  <span
                    className="hidden sm:inline text-[0.6rem] text-muted-foreground tabular-nums truncate text-center"
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
                  className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-3 min-w-3 sm:h-4 sm:min-w-4 items-center justify-center rounded-full bg-primary/90 px-0.5 sm:px-1 text-[0.5rem] sm:text-[0.55rem] font-bold text-primary-foreground"
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
