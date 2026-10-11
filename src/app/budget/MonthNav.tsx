"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
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

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}월`,
}));

export function MonthNav({ currentMonth }: { currentMonth: string }) {
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
    <div className="flex items-center justify-between gap-4 p-3 md:p-4 rounded-card bg-card">
      <Button
        variant="outline"
        size="default"
        onClick={() => goTo(prevMonth(currentMonth))}
        className="rounded-control shrink-0 h-12 w-12 px-0 border-0 bg-divider text-fg-secondary hover:bg-accent-soft hover:text-primary touch-manipulation"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "t4 numeric flex items-center justify-center gap-2 font-bold text-foreground min-w-[170px] py-2 px-4 rounded-control transition-colors touch-manipulation",
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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="t7 font-medium text-fg-tertiary shrink-0">연도</label>
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
                <label className="t7 font-medium text-fg-tertiary shrink-0">월</label>
                <ResponsiveSelect
                  value={monthInput}
                  onValueChange={(v) => v && setMonthInput(v)}
                  options={MONTHS.map((mo) => ({ value: mo.value, label: mo.label }))}
                  placeholder="월 선택"
                  size="sm"
                  triggerClassName="t7 h-8 flex-1 rounded-control"
                />
              </div>
              <Button
                size="sm"
                className="w-full rounded-control bg-primary text-primary-foreground"
                onClick={applyQuickSelect}
              >
                해당 월로 이동
              </Button>
            </div>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="default"
        onClick={() => goTo(nextMonth(currentMonth))}
        className="rounded-control shrink-0 h-12 w-12 px-0 border-0 bg-divider text-fg-secondary hover:bg-accent-soft hover:text-primary touch-manipulation"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
