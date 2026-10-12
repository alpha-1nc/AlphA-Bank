"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { BottomSheet, IconButton, ListRow, TextButton, TextField, useDialog, useToast } from "@/components/ui";
import type { WorkRecord } from "@/generated/prisma";
import {
  createWorkRecord,
  createWorkRecordsBatch,
  deleteWorkRecord,
  updateWorkRecord,
} from "@/actions/workRecord.actions";
import { formatKstDateKey } from "@/lib/kst-date-key";
import WorkBulkDayPicker from "@/components/work/WorkBulkDayPicker";

type Step = "form" | "dates" | "break" | "sameDay";

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
  const [breakM, setBreakM] = useState<number>(0);
  const [step, setStep] = useState<Step>("form");
  const { openToast } = useToast();
  const { openConfirm } = useDialog();
  const [pending, startTransition] = useTransition();

  const [bulkCalendarYear, setBulkCalendarYear] = useState(viewYear);
  const [bulkCalendarMonth, setBulkCalendarMonth] = useState(viewMonth);
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState<Set<string>>(
    () => new Set()
  );

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
      setBreakM(0);
      return;
    }
    const rec = recordsOnDay.find((r) => r.id === editId);
    if (!rec) return;
    setStartTime(toTimeInput(parseDateSafe(rec.startTime)));
    setEndTime(toTimeInput(parseDateSafe(rec.endTime)));
    setBreakM(rec.breakTimeMinutes ?? 30);
  }, [editId, recordsOnDay]);

  function showError(message: string) {
    openToast(message, { type: "bottom" });
  }

  /** 입력값·step 초기화는 부모가 열 때마다 key 를 바꿔 새로 마운트하는 것으로 처리 (닫힘 애니메이션 중 화면이 바뀌지 않도록) */
  function handleClose() {
    onOpenChange(false);
  }

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
    if (!editId && bulkSelectedKeys.size === 0) {
      showError("달력에서 등록할 날짜를 한 개 이상 선택해 주세요.");
      return;
    }
    const err = validate();
    if (err) {
      showError(err);
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
          handleClose();
        } else {
          showError(res.error);
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
            overtimeMinutes: null,
            nightMinutes: null,
            holidayMinutes: null,
            bonusAmount: null,
            isBonusTaxable: null,
            leaveUsed: null,
          };
        });
        const res = await createWorkRecordsBatch(payloads);
        if (res.success) {
          onSuccess();
          handleClose();
        } else {
          showError(res.error);
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
          overtimeMinutes: null,
          nightMinutes: null,
          holidayMinutes: null,
          bonusAmount: null,
          isBonusTaxable: null,
          leaveUsed: null,
        });
        if (res.success) {
          onSuccess();
          handleClose();
        } else {
          showError(res.error);
        }
      }
    });
  }

  async function handleDelete() {
    if (!editId) return;
    const ok = await openConfirm({
      title: "이 근무 기록을 삭제할까요?",
      confirmButton: "삭제",
      cancelButton: "취소",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteWorkRecord(editId);
      if (res.success) {
        onSuccess();
        handleClose();
      } else {
        showError(res.error ?? "삭제에 실패했습니다.");
      }
    });
  }

  const sameDaySelectOptions = useMemo(() => {
    return [
      { value: "__new__", label: "새 근무 등록" },
      ...recordsOnDay.map((r, i) => ({
        value: r.id,
        label:
          recordsOnDay.length > 1
            ? `${i + 1}번째 · ${formatSameDayRecordLabel(r)}`
            : formatSameDayRecordLabel(r),
      })),
    ];
  }, [recordsOnDay]);

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

  const timeError = validate();
  const missingTime = !startTime || !endTime;
  const title = editId
    ? "근무 수정"
    : bulkSelectedKeys.size > 1
      ? `근무 등록 (${bulkSelectedKeys.size}일)`
      : "근무 등록";
  const editingRecord = editId ? recordsOnDay.find((r) => r.id === editId) : undefined;
  const sameDayLabel = editingRecord ? formatSameDayRecordLabel(editingRecord) : "새 근무 등록";

  function subHeader(text: string) {
    return (
      <div className="flex items-center gap-1">
        <IconButton aria-label="뒤로가기" icon={ChevronLeft} variant="clear" iconSize={24} onClick={() => setStep("form")} />
        <BottomSheet.Header>{text}</BottomSheet.Header>
      </div>
    );
  }

  function selectSameDay(v: string) {
    if (v === "__new__") {
      setEditId(null);
      setStartTime("09:00");
      setEndTime("18:00");
      setBreakM(0);
    } else {
      setEditId(v);
      const rec = recordsOnDay.find((r) => r.id === v);
      if (rec) {
        setStartTime(toTimeInput(parseDateSafe(rec.startTime)));
        setEndTime(toTimeInput(parseDateSafe(rec.endTime)));
        setBreakM(rec.breakTimeMinutes ?? 30);
      }
    }
    setStep("form");
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      hasTextField
      header={
        step === "dates"
          ? subHeader("근무일 선택")
          : step === "break"
            ? subHeader("휴게 시간")
            : step === "sameDay"
              ? subHeader("같은 날 근무")
              : <BottomSheet.Header>{title}</BottomSheet.Header>
      }
      cta={
        step === "form" ? (
          <div className="flex flex-col gap-3">
            <BottomSheet.CTA
              loading={pending}
              disabled={(!editId && bulkSelectedKeys.size === 0) || missingTime}
              onClick={handleSubmit}
            >
              {editId ? "저장" : bulkSelectedKeys.size > 1 ? `선택한 ${bulkSelectedKeys.size}일에 등록` : "등록"}
            </BottomSheet.CTA>
            {editId && (
              <div className="flex justify-center">
                <TextButton
                  size="small"
                  variant="clear"
                  disabled={pending}
                  style={{ color: "var(--tk-negative)" }}
                  onClick={handleDelete}
                >
                  근무 기록 삭제
                </TextButton>
              </div>
            )}
          </div>
        ) : step === "dates" ? (
          <BottomSheet.CTA onClick={() => setStep("form")}>완료</BottomSheet.CTA>
        ) : undefined
      }
    >
      {step === "dates" ? (
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
      ) : step === "break" ? (
        <div className="-mx-6 flex flex-col">
          {BREAK_OPTIONS.map((m) => (
            <ListRow
              key={m}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={`${m}분`} />}
              right={m === breakM ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => {
                setBreakM(m);
                setStep("form");
              }}
            />
          ))}
        </div>
      ) : step === "sameDay" ? (
        <div className="-mx-6 flex flex-col">
          {sameDaySelectOptions.map((o) => (
            <ListRow
              key={o.value}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={o.label} />}
              right={o.value === (editId ?? "__new__") ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => selectSameDay(o.value)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-1 pt-2">
          {recordsOnDay.length > 0 && (editId || bulkSelectedKeys.size <= 1) && (
            <ListRow
              withTouchEffect
              withArrow
              border="none"
              horizontalPadding="small"
              className="rounded-control bg-divider"
              onClick={() => setStep("sameDay")}
              contents={<span className="t5 font-medium text-fg-tertiary">같은 날 근무</span>}
              right={<span className="t5 font-medium text-foreground">{sameDayLabel}</span>}
            />
          )}

          {editId ? (
            <ListRow
              border="none"
              horizontalPadding="small"
              className="rounded-control bg-divider"
              contents={<span className="t5 font-medium text-fg-tertiary">근무일</span>}
              right={<span className="t5 font-medium text-foreground">{dateLabel}</span>}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <ListRow
                withTouchEffect
                withArrow
                border="none"
                horizontalPadding="small"
                className="rounded-control bg-divider"
                onClick={() => setStep("dates")}
                contents={<span className="t5 font-medium text-fg-tertiary">근무일</span>}
                right={<span className="t5 font-medium text-foreground">{formatBulkDateSummary(bulkSelectedKeys)}</span>}
              />
              <p className="st12 text-fg-tertiary">
                근무일을 누르면 달력에서 여러 날을 선택할 수 있어요.
              </p>
            </div>
          )}

          {!editId && bulkSelectedKeys.size > 1 && (
            <p className="t7 text-fg-tertiary">
              아래 시작·종료·휴게는 선택한 모든 날에 동일하게 적용됩니다.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <TextField
              variant="box"
              label="시작"
              labelOption="sustain"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <TextField
              variant="box"
              label="종료"
              labelOption="sustain"
              type="time"
              hasError={!!timeError}
              help={timeError ?? undefined}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <ListRow
            withTouchEffect
            withArrow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            onClick={() => setStep("break")}
            contents={<span className="t5 font-medium text-fg-tertiary">휴게</span>}
            right={<span className="t5 font-medium text-foreground">{breakM}분</span>}
          />

          <p className="t7 text-fg-tertiary">
            시급·3.3% 세금·주휴수당은{" "}
            <span className="font-medium text-foreground">설정 → 근무지</span>에서
            바꿀 수 있습니다.
          </p>

        </div>
      )}
    </BottomSheet>
  );
}
