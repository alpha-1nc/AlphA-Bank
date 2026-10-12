"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatKstDateKey } from "@/lib/kst-date-key";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const out: { key: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    out.push({ key: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    out.push({ key: formatKstDateKey(date) });
  }
  while (out.length % 7 !== 0) {
    out.push({ key: null });
  }
  return out;
}

function weekdayKeysInMonth(
  year: number,
  month: number,
  weekday: number
): string[] {
  const keys: string[] = [];
  const dim = new Date(year, month, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() === weekday) {
      keys.push(formatKstDateKey(dt));
    }
  }
  return keys;
}

type Props = {
  year: number;
  month: number;
  onYearMonthChange: (y: number, m: number) => void;
  selectedKeys: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
};

export default function WorkBulkDayPicker({
  year,
  month,
  onYearMonthChange,
  selectedKeys,
  onChange,
  disabled,
}: Props) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const title = useMemo(
    () =>
      new Date(year, month - 1, 1).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
      }),
    [year, month]
  );

  const todayKey = formatKstDateKey(new Date());

  function toggleKey(key: string) {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleWeekday(weekday: number) {
    const keys = weekdayKeysInMonth(year, month, weekday);
    if (keys.length === 0) return;
    const allOn = keys.every((k) => selectedKeys.has(k));
    const next = new Set(selectedKeys);
    if (allOn) {
      for (const k of keys) next.delete(k);
    } else {
      for (const k of keys) next.add(k);
    }
    onChange(next);
  }

  function prevMonth() {
    if (month === 1) onYearMonthChange(year - 1, 12);
    else onYearMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onYearMonthChange(year + 1, 1);
    else onYearMonthChange(year, month + 1);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <IconButton aria-label="이전 달" icon={ChevronLeft} variant="clear" disabled={disabled} onClick={prevMonth} />
        <p className="t6 numeric font-bold text-foreground truncate text-center min-w-0">
          {title}
        </p>
        <IconButton aria-label="다음 달" icon={ChevronRight} variant="clear" disabled={disabled} onClick={nextMonth} />
      </div>

      <div>
        <p className="st12 font-medium text-fg-tertiary mb-2">
          요일로 한 번에 (이번 달 해당 요일 전체 선택·해제)
        </p>
        <div className="grid grid-cols-7 gap-1">
          {WEEK_LABELS.map((label, weekday) => (
            <Button
              key={weekday}
              size="small"
              color="light"
              variant="weak"
              className="min-w-0 px-0"
              onClick={() => toggleWeekday(weekday)}
              disabled={disabled}
              title={`이번 달 ${label}요일 전체`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="st12 font-medium text-fg-tertiary mb-2">
          날짜 탭으로 추가·제거
        </p>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEK_LABELS.map((w) => (
            <div
              key={w}
              className="st13 font-medium text-fg-tertiary py-1"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell.key) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="aspect-square min-h-[2rem]"
                />
              );
            }
            const sel = selectedKeys.has(cell.key);
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={disabled}
                onClick={() => toggleKey(cell.key!)}
                className={cn(
                  "st12 numeric aspect-square min-h-[2rem] rounded-control font-semibold transition-colors",
                  "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  sel
                    ? "border-primary bg-primary text-primary-foreground"
                    : isToday
                      ? "border-primary bg-card text-foreground"
                      : "border-divider bg-card text-foreground hover:bg-accent-soft"
                )}
              >
                {parseInt(cell.key.slice(-2), 10)}
              </button>
            );
          })}
        </div>
      </div>

      <p className="t7 text-fg-tertiary">
        선택{" "}
        <span className="numeric font-bold text-foreground">
          {selectedKeys.size}
        </span>
        일
      </p>
    </div>
  );
}
