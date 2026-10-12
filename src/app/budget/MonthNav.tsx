"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
}

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** 연도 입력과 월 셀렉트가 같은 모양으로 보이도록 공유하는 필드 스타일 */
const POPOVER_FIELD_CLASS =
  "t6 h-11 w-full min-w-0 rounded-control border-0 bg-divider px-3 text-foreground outline-none placeholder:text-fg-disabled focus-visible:ring-2 focus-visible:ring-primary/30";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}월`,
}));

export function MonthNav({ currentMonth, className }: { currentMonth: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [yearInput, setYearInput] = useState(() => currentMonth.split("-")[0]);
  const [monthInput, setMonthInput] = useState(() => currentMonth.split("-")[1]);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setYearInput(currentMonth.split("-")[0]);
    setMonthInput(currentMonth.split("-")[1]);
  }, [currentMonth]);

  useEffect(() => {
    if (open) {
      yearInputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function goTo(month: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("month", month);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function applyQuickSelect() {
    const y = Number(yearInput);
    const m = monthInput;
    if (y >= 2000 && y <= 2100 && m >= "01" && m <= "12") {
      goTo(`${y}-${m}`);
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconButton
        aria-label="이전 달"
        icon={ChevronLeft}
        variant="clear"
        onClick={() => goTo(prevMonth(currentMonth))}
      />

      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "t5 numeric flex items-center justify-center gap-2 font-bold text-foreground min-w-[140px] py-2 px-3 rounded-control transition-colors touch-manipulation",
            "hover:bg-divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          )}
        >
          {formatMonthLabel(currentMonth)}
          <ChevronDown
            className={cn("h-5 w-5 text-fg-tertiary transition-transform", open && "rotate-180")}
          />
        </button>

        {open && (
          <div
            ref={panelRef}
            className="absolute left-1/2 top-full -translate-x-1/2 mt-2 z-50 w-[220px] rounded-control border border-divider bg-card p-4 animate-in fade-in-0 zoom-in-95"
            onKeyDown={(e) => e.key === "Enter" && applyQuickSelect()}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="budget-year" className="t7 w-8 shrink-0 text-left font-medium text-fg-tertiary">
                  연도
                </label>
                <div className="relative min-w-0 flex-1">
                  <input
                    id="budget-year"
                    ref={yearInputRef}
                    type="number"
                    inputMode="numeric"
                    min={2000}
                    max={2100}
                    step={1}
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                    className={POPOVER_FIELD_CLASS}
                    placeholder="2026"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="budget-month" className="t7 w-8 shrink-0 text-left font-medium text-fg-tertiary">
                  월
                </label>
                <div className="relative min-w-0 flex-1">
                  <select
                    id="budget-month"
                    value={monthInput}
                    onChange={(e) => e.target.value && setMonthInput(e.target.value)}
                    className={cn(POPOVER_FIELD_CLASS, "appearance-none pr-9")}
                  >
                    {MONTHS.map((mo) => (
                      <option key={mo.value} value={mo.value}>
                        {mo.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: "var(--tk-tertiary-fg)" }}
                    aria-hidden
                  />
                </div>
              </div>
              <div className="pl-10 pt-1">
                <Button size="small" color="primary" variant="fill" display="block" onClick={applyQuickSelect}>
                  해당 월로 이동
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <IconButton
        aria-label="다음 달"
        icon={ChevronRight}
        variant="clear"
        onClick={() => goTo(nextMonth(currentMonth))}
      />
    </div>
  );
}
