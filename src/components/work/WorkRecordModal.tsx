"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";
import type { WorkRecord } from "@/generated/prisma";
import {
  createWorkRecord,
  createWorkRecordsBatch,
  deleteWorkRecord,
  getWorkRecordsByDateRange,
  updateWorkRecord,
} from "@/actions/workRecord.actions";
import { formatKstDateKey } from "@/lib/kst-date-key";
import WorkBulkDayPicker from "@/components/work/WorkBulkDayPicker";
import {
  calculateDailyBasePay,
  calculateTaxDeduction,
  calculateWeeklyAllowanceForWeek,
} from "@/utils/calculator";
import type { WorkRecordForWeeklyAllowance } from "@/utils/calculator";
import { getLocalWeekRangeContaining } from "@/lib/work-week";

const BREAK_OPTIONS = [0, 30, 60, 90, 120] as const;

export type WorkplacePayrollProps = {
  hourlyWage: number;
  isWeeklyAllowanceActive: boolean;
  isTaxActive: boolean;
};

function parseDateSafe(d: unknown): Date {
  return d instanceof Date ? d : new Date(d as string);
}

function toTimeInput(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 같은 날 근무 선택 UI용 — UUID 대신 표시할 한국어 라벨 */
function formatSameDayRecordLabel(record: WorkRecord): string {
  const start = parseDateSafe(record.startTime);
  const end = parseDateSafe(record.endTime);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(start)} ~ ${fmt.format(end)}`;
}

function combineDateAndTime(day: Date, timeStr: string): Date {
  const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
  const x = new Date(day);
  x.setHours(hh || 0, mm || 0, 0, 0);
  return x;
}

function dateFromKstKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatBulkDateSummary(keys: Set<string>): string {
  const arr = Array.from(keys).sort();
  if (arr.length === 0) return "날짜를 선택해 주세요";
  const fullFmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  if (arr.length === 1) {
    return fullFmt.format(dateFromKstKey(arr[0]));
  }
  const first = dateFromKstKey(arr[0]);
  const last = dateFromKstKey(arr[arr.length - 1]);
  const rangeFmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  });
  return `${arr.length}일 선택 · ${rangeFmt.format(first)}~${rangeFmt.format(last)}`;
}

function toWeeklyCalc(r: WorkRecord): WorkRecordForWeeklyAllowance {
  return {
    startTime: parseDateSafe(r.startTime),
    endTime: parseDateSafe(r.endTime),
    breakTimeMinutes: r.breakTimeMinutes,
    hourlyWage: r.hourlyWage,
    isWeeklyAllowanceActive: r.isWeeklyAllowanceActive,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workplaceId: string;
  /** 근무지에 저장된 시급·세금·주휴 설정 (근무 기록 저장 시 반영) */
  payroll: WorkplacePayrollProps;
  selectedDate: Date;
  /** 급여 화면에서 보고 있는 달 (반복 등록 미니 달력 초기값) */
  viewYear: number;
  viewMonth: number;
  recordsOnDay: WorkRecord[];
  onSuccess: () => void;
};

export default function WorkRecordModal({
  open,
  onOpenChange,
  workplaceId,
  payroll,
  selectedDate,
  viewYear,
  viewMonth,
  recordsOnDay,
  onSuccess,
}: Props) {
  const [editId, setEditId] = useState<string | null>(
    () => recordsOnDay[0]?.id ?? null
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakM, setBreakM] = useState<number>(30);
  const [weekRecords, setWeekRecords] = useState<WorkRecord[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [bulkCalendarYear, setBulkCalendarYear] = useState(viewYear);
  const [bulkCalendarMonth, setBulkCalendarMonth] = useState(viewMonth);
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState<Set<string>>(
    () => new Set()
  );

  const estimateReferenceDate = useMemo(() => {
    if (editId) return selectedDate;
    if (bulkSelectedKeys.size > 0) {
      const keys = Array.from(bulkSelectedKeys).sort();
      return dateFromKstKey(keys[0]);
    }
    return selectedDate;
  }, [editId, bulkSelectedKeys, selectedDate]);

  const loadWeek = useCallback(async () => {
    const { startInclusive, endInclusive } =
      getLocalWeekRangeContaining(estimateReferenceDate);
    const res = await getWorkRecordsByDateRange(
      workplaceId,
      startInclusive,
      endInclusive
    );
    if (res.success) {
      setWeekRecords(res.data);
    }
  }, [workplaceId, estimateReferenceDate]);

  useEffect(() => {
    if (!open) return;
    void loadWeek();
  }, [open, loadWeek]);

  useEffect(() => {
    if (!open) return;
    setBulkCalendarYear(viewYear);
    setBulkCalendarMonth(viewMonth);
    setBulkSelectedKeys(new Set([formatKstDateKey(selectedDate)]));
  }, [open, viewYear, viewMonth, selectedDate]);

  useEffect(() => {
    if (!editId) {
      setStartTime("09:00");
      setEndTime("18:00");
      setBreakM(30);
      return;
    }
    const rec = recordsOnDay.find((r) => r.id === editId);
    if (!rec) return;
    setStartTime(toTimeInput(parseDateSafe(rec.startTime)));
    setEndTime(toTimeInput(parseDateSafe(rec.endTime)));
    setBreakM(rec.breakTimeMinutes);
  }, [editId, recordsOnDay]);

  const estimate = useMemo(() => {
    const wageNum = payroll.hourlyWage;
    if (wageNum < 0) {
      return null;
    }
    const start = combineDateAndTime(estimateReferenceDate, startTime);
    const end = combineDateAndTime(estimateReferenceDate, endTime);
    const dailyBase = calculateDailyBasePay({
      startTime: start,
      endTime: end,
      breakTimeMinutes: breakM,
      hourlyWage: wageNum,
    });

    const draft: WorkRecordForWeeklyAllowance = {
      startTime: start,
      endTime: end,
      breakTimeMinutes: breakM,
      hourlyWage: wageNum,
      isWeeklyAllowanceActive: payroll.isWeeklyAllowanceActive,
    };

    const others = weekRecords.filter((r) => r.id !== editId);
    const calcList: WorkRecordForWeeklyAllowance[] = [
      ...others.map(toWeeklyCalc),
      draft,
    ];

    let weekBaseSum = 0;
    for (const r of calcList) {
      weekBaseSum += calculateDailyBasePay({
        startTime: r.startTime,
        endTime: r.endTime,
        breakTimeMinutes: r.breakTimeMinutes,
        hourlyWage: r.hourlyWage,
      });
    }

    const weeklyAllow = calculateWeeklyAllowanceForWeek(calcList);
    const tax = calculateTaxDeduction({
      baseTotal: weekBaseSum,
      weeklyAllowanceTotal: weeklyAllow,
      isTaxActive: payroll.isTaxActive,
    });
    const netWeek = weekBaseSum + weeklyAllow - tax;

    return { dailyBase, weeklyAllow, tax, netWeek, weekBaseSum };
  }, [
    payroll.hourlyWage,
    payroll.isWeeklyAllowanceActive,
    payroll.isTaxActive,
    startTime,
    endTime,
    breakM,
    estimateReferenceDate,
    weekRecords,
    editId,
  ]);

  function validate(): string | null {
    const ref =
      !editId && bulkSelectedKeys.size > 0
        ? dateFromKstKey(Array.from(bulkSelectedKeys).sort()[0])
        : selectedDate;
    const start = combineDateAndTime(ref, startTime);
    const end = combineDateAndTime(ref, endTime);
    if (end.getTime() <= start.getTime()) {
      return "종료 시간은 시작 시간보다 늦어야 합니다.";
    }
    return null;
  }

  function handleSubmit() {
    setLocalError(null);
    if (!editId && bulkSelectedKeys.size === 0) {
      setLocalError("달력에서 등록할 날짜를 한 개 이상 선택해 주세요.");
      return;
    }
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    const wageNum = payroll.hourlyWage;

    startTransition(async () => {
      if (editId) {
        const start = combineDateAndTime(selectedDate, startTime);
        const end = combineDateAndTime(selectedDate, endTime);
        const res = await updateWorkRecord(editId, {
          date: selectedDate,
          startTime: start,
          endTime: end,
          breakTimeMinutes: breakM,
          hourlyWage: wageNum,
          isWeeklyAllowanceActive: payroll.isWeeklyAllowanceActive,
          isTaxActive: payroll.isTaxActive,
        });
        if (res.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setLocalError(res.error);
        }
      } else if (bulkSelectedKeys.size > 1) {
        const keys = Array.from(bulkSelectedKeys).sort();
        const payloads = keys.map((key) => {
          const day = dateFromKstKey(key);
          const start = combineDateAndTime(day, startTime);
          const end = combineDateAndTime(day, endTime);
          return {
            workplaceId,
            date: day,
            startTime: start,
            endTime: end,
            breakTimeMinutes: breakM,
            hourlyWage: wageNum,
            isWeeklyAllowanceActive: payroll.isWeeklyAllowanceActive,
            isTaxActive: payroll.isTaxActive,
          };
        });
        const res = await createWorkRecordsBatch(payloads);
        if (res.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setLocalError(res.error);
        }
      } else {
        const keys = Array.from(bulkSelectedKeys).sort();
        const dayKey = keys[0] ?? formatKstDateKey(selectedDate);
        const day = dateFromKstKey(dayKey);
        const start = combineDateAndTime(day, startTime);
        const end = combineDateAndTime(day, endTime);
        const res = await createWorkRecord({
          workplaceId,
          date: day,
          startTime: start,
          endTime: end,
          breakTimeMinutes: breakM,
          hourlyWage: wageNum,
          isWeeklyAllowanceActive: payroll.isWeeklyAllowanceActive,
          isTaxActive: payroll.isTaxActive,
        });
        if (res.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setLocalError(res.error);
        }
      }
    });
  }

  function handleDelete() {
    if (!editId) return;
    if (!window.confirm("이 근무 기록을 삭제할까요?")) return;
    startTransition(async () => {
      const res = await deleteWorkRecord(editId);
      if (res.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setLocalError(res.error ?? "삭제에 실패했습니다.");
      }
    });
  }

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(selectedDate),
    [selectedDate]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-slate-100 dark:border-white/10">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {editId
              ? "근무 수정"
              : bulkSelectedKeys.size > 1
                ? `근무 등록 (${bulkSelectedKeys.size}일)`
                : "근무 등록"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {recordsOnDay.length > 0 &&
            (editId || bulkSelectedKeys.size <= 1) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                같은 날 근무 추가
              </label>
              <Select
                value={editId ?? "__new__"}
                onValueChange={(v) => {
                  if (v === "__new__") {
                    setEditId(null);
                    setStartTime("09:00");
                    setEndTime("18:00");
                    setBreakM(30);
                  } else {
                    setEditId(v);
                    const rec = recordsOnDay.find((r) => r.id === v);
                    if (rec) {
                      setStartTime(toTimeInput(parseDateSafe(rec.startTime)));
                      setEndTime(toTimeInput(parseDateSafe(rec.endTime)));
                      setBreakM(rec.breakTimeMinutes);
                    }
                  }
                }}
              >
                <SelectTrigger className="rounded-2xl w-full">
                  <SelectValue placeholder="선택">
                    {editId
                      ? (() => {
                          const rec = recordsOnDay.find((r) => r.id === editId);
                          return rec ? formatSameDayRecordLabel(rec) : "선택";
                        })()
                      : "새 근무 등록"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">새 근무 등록</SelectItem>
                  {recordsOnDay.map((r, i) => (
                    <SelectItem key={r.id} value={r.id}>
                      {recordsOnDay.length > 1
                        ? `${i + 1}번째 · ${formatSameDayRecordLabel(r)}`
                        : formatSameDayRecordLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">근무일</label>
            {editId ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-3 py-2 text-sm font-medium text-foreground">
                <CalendarDays
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span>{dateLabel}</span>
              </div>
            ) : (
              <Popover.Root modal={false}>
                <Popover.Trigger
                  type="button"
                  disabled={pending}
                  title="날짜를 눌러 여러 날 선택"
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-2xl border border-slate-100 dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] px-3 py-2 text-left text-sm font-medium transition-colors",
                    "hover:border-primary/35 hover:bg-muted/50 dark:hover:bg-white/[0.06]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
                    pending && "pointer-events-none opacity-60"
                  )}
                >
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 leading-snug">
                    {formatBulkDateSummary(bulkSelectedKeys)}
                  </span>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner
                    side="bottom"
                    align="start"
                    sideOffset={8}
                    className="z-[100] isolate w-[min(calc(100vw-2rem),var(--anchor-width))] max-w-[min(calc(100vw-2rem),var(--anchor-width))]"
                  >
                    <Popover.Popup
                      className={cn(
                        "rounded-2xl border border-slate-100 dark:border-white/10 bg-popover text-popover-foreground shadow-lg",
                        "ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                        "max-h-[min(70vh,480px)] overflow-y-auto p-3 sm:p-4"
                      )}
                    >
                      <WorkBulkDayPicker
                        year={bulkCalendarYear}
                        month={bulkCalendarMonth}
                        onYearMonthChange={(y, m) => {
                          setBulkCalendarYear(y);
                          setBulkCalendarMonth(m);
                        }}
                        selectedKeys={bulkSelectedKeys}
                        onChange={setBulkSelectedKeys}
                        disabled={pending}
                      />
                      <Popover.Close
                        type="button"
                        className={cn(
                          "mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition-colors",
                          "hover:bg-muted hover:text-foreground",
                          "dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                        )}
                      >
                        완료
                      </Popover.Close>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            )}
            {!editId && (
              <p className="text-[0.7rem] text-muted-foreground leading-relaxed">
                아이콘 옆 날짜를 누르면 달력에서 여러 날을 선택할 수 있어요.
              </p>
            )}
          </div>

          {!editId && bulkSelectedKeys.size > 1 && (
            <p className="text-xs text-muted-foreground leading-relaxed -mt-2">
              아래 시작·종료·휴게는 선택한 모든 날에 동일하게 적용됩니다.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">시작</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">종료</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">휴게</label>
            <Select
              value={String(breakM)}
              onValueChange={(v) => {
                if (v != null && v !== "") setBreakM(parseInt(v, 10));
              }}
            >
              <SelectTrigger className="rounded-xl w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BREAK_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}분
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            시급·3.3% 세금·주휴수당은{" "}
            <span className="font-medium text-foreground">설정 → 근무지</span>에서
            바꿀 수 있습니다.
          </p>

          {estimate && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3 space-y-2 transition-colors">
              {!editId && bulkSelectedKeys.size > 1 && (
                <p className="text-[0.65rem] text-muted-foreground leading-relaxed">
                  여러 날 등록 시, 선택한 날짜 중 가장 이른 날을 기준으로 주 단위 예상을
                  보여 줍니다.
                </p>
              )}
              <p className="text-xs font-medium text-muted-foreground">
                이번 주 기준 예상 실수령액 (세후)
              </p>
              <p className="text-2xl font-black tabular-nums tracking-tight text-primary">
                {estimate.netWeek.toLocaleString("ko-KR")}원
              </p>
              <div className="text-[0.7rem] text-muted-foreground space-y-0.5 leading-relaxed">
                <p>
                  이번 근무 일일 기본:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {estimate.dailyBase.toLocaleString("ko-KR")}원
                  </span>
                </p>
                <p className="tabular-nums">
                  주 단위 합산: 기본 {estimate.weekBaseSum.toLocaleString("ko-KR")}원 ·
                  주휴 {estimate.weeklyAllow.toLocaleString("ko-KR")}원 · 세금{" "}
                  {estimate.tax.toLocaleString("ko-KR")}원
                </p>
              </div>
            </div>
          )}

          {localError && (
            <p className="text-sm text-destructive" role="alert">
              {localError}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            {editId && (
              <Button
                type="button"
                variant="destructive"
                className="rounded-2xl sm:mr-auto"
                onClick={handleDelete}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                삭제
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              type="button"
              className="rounded-2xl flex-1"
              onClick={handleSubmit}
              disabled={pending || (!editId && bulkSelectedKeys.size === 0)}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editId ? (
                "저장"
              ) : bulkSelectedKeys.size > 1 ? (
                `선택한 ${bulkSelectedKeys.size}일에 등록`
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
