"use client";

import { useLayoutEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Plus, Loader2 } from "lucide-react";
import {
  PAY_PERIOD_MODE,
  SALARY_PERIOD_MODE,
  payPeriodModeLabel,
} from "@/lib/work-pay-schedule";
import type { Workplace } from "@/generated/prisma";
import { createWorkplace } from "@/actions/workplace.actions";
import { WORKPLACE_TYPE } from "@/lib/workplace-type";
import {
  FieldSwitch,
  HourlyWageField,
} from "@/components/work/PayrollFormFields";

const PAYDAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const PAYDAY_SELECT_OPTIONS = PAYDAY_OPTIONS.map((d) => ({
  value: String(d),
  label: `매월 ${d}일`,
}));

const PAY_PERIOD_SELECT_OPTIONS = [
  {
    value: SALARY_PERIOD_MODE.CURRENT_MONTH,
    label: payPeriodModeLabel(SALARY_PERIOD_MODE.CURRENT_MONTH),
  },
  {
    value: PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY,
    label: payPeriodModeLabel(PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY),
  },
];

type Props = {
  workplaces: Workplace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onWorkplaceCreated: (w: Workplace) => void;
};

export default function WorkplaceSelector({
  workplaces,
  selectedId,
  onSelect,
  onWorkplaceCreated,
}: Props) {
  const active = workplaces.filter((w) => w.isActive);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [hourly, setHourly] = useState("10030");
  const [weeklyOn, setWeeklyOn] = useState(true);
  const [taxOn, setTaxOn] = useState(true);
  const [payday, setPayday] = useState("10");
  const [payMode, setPayMode] = useState<string>(PAY_PERIOD_MODE.CALENDAR_MONTH);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [modalMount, setModalMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setModalMount(document.body);
  }, []);

  function resetPayrollForm() {
    setHourly("10030");
    setWeeklyOn(true);
    setTaxOn(true);
    setPayday("10");
    setPayMode(PAY_PERIOD_MODE.CALENDAR_MONTH);
  }

  function submitCreate() {
    const wageNum = parseInt(hourly, 10);
    if (Number.isNaN(wageNum) || wageNum < 0) {
      setError("시급을 올바르게 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await createWorkplace({
        name: name.trim(),
        type: WORKPLACE_TYPE.PARTTIME,
        hourlyWage: wageNum,
        isWeeklyAllowanceActive: weeklyOn,
        isTaxActive: taxOn,
        paydayOfMonth: parseInt(payday, 10),
        payPeriodMode: payMode,
      });
      if (res.success) {
        onWorkplaceCreated(res.data);
        setCreating(false);
        setName("");
        resetPayrollForm();
      } else {
        setError(res.error);
      }
    });
  }

  if (active.length === 0 && !creating) {
    return (
      <div className="rounded-card bg-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="t7 text-fg-tertiary mb-4">
          등록된 근무지가 없습니다. 첫 근무지를 추가해 주세요.
        </p>
        <Button
          type="button"
          variant="outline"
          className="rounded-control border-0 bg-divider text-foreground hover:bg-divider"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          근무지 추가
        </Button>
      </div>
    );
  }

  if (active.length === 0 && creating) {
    return (
      <form
        className="rounded-card bg-card p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          submitCreate();
        }}
      >
        <p className="t5 font-bold text-foreground">새 근무지</p>
        <div className="space-y-2">
          <label className="t7 font-medium text-fg-tertiary ml-1">이름</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 편의점 A점"
            className="t6 h-11 rounded-control border-0 bg-background text-foreground"
            required
          />
        </div>
        <HourlyWageField
          id="wp-first-hourly"
          value={hourly}
          onChange={setHourly}
        />
        <FieldSwitch
          label="주휴수당 적용"
          checked={weeklyOn}
          onCheckedChange={setWeeklyOn}
        />
        <FieldSwitch
          label="3.3% 세금 공제"
          checked={taxOn}
          onCheckedChange={setTaxOn}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              월급일 (매월)
            </label>
            <ResponsiveSelect
              value={payday}
              onValueChange={(v) => v != null && setPayday(v)}
              options={PAYDAY_SELECT_OPTIONS}
              placeholder="일 선택"
              triggerClassName="t6 h-11 rounded-control border-0 bg-background text-foreground w-full"
              contentClassName="max-h-60 rounded-control"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              급여 기간
            </label>
            <ResponsiveSelect
              value={payMode}
              onValueChange={(v) => v != null && setPayMode(v)}
              options={PAY_PERIOD_SELECT_OPTIONS}
              placeholder="급여 기간 선택"
              triggerClassName="t6 h-11 rounded-control border-0 bg-background text-foreground w-full min-w-0"
              contentClassName="rounded-control max-w-[min(100vw-2rem,24rem)]"
              renderValue={(v) =>
                v != null && v !== "" ? payPeriodModeLabel(v) : null
              }
            />
          </div>
        </div>
        {error && (
          <p className="t7 text-negative" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-control border-0 bg-divider text-foreground hover:bg-divider"
            onClick={() => {
              setCreating(false);
              setError(null);
              resetPayrollForm();
            }}
          >
            취소
          </Button>
          <Button type="submit" className="rounded-control bg-primary font-bold text-primary-foreground flex-1" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-card bg-card p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        {active.map((w) => {
          const isSel = selectedId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w.id)}
              className={cn(
                "t6 inline-flex max-w-full min-w-0 items-center rounded-pill px-4 py-2 font-semibold transition-colors duration-200 touch-manipulation",
                isSel
                  ? "bg-accent-soft text-primary"
                  : "text-fg-tertiary hover:text-fg-secondary active:scale-[0.98]"
              )}
            >
              <span className="truncate">{w.name}</span>
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-control border-0 bg-divider text-foreground hover:bg-divider shrink-0"
        onClick={() => setCreating(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        근무지 추가
      </Button>
      {creating &&
        modalMount &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in-0"
            role="presentation"
          >
            <form
            className="w-full max-w-sm max-h-[min(90vh,720px)] overflow-y-auto rounded-card bg-card p-6 space-y-4 animate-in zoom-in-95"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              submitCreate();
            }}
          >
            <p className="t5 font-bold text-foreground">새 근무지</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="근무지 이름"
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
              required
            />
            <HourlyWageField
              id="wp-modal-hourly"
              value={hourly}
              onChange={setHourly}
            />
            <FieldSwitch
              label="주휴수당 적용"
              checked={weeklyOn}
              onCheckedChange={setWeeklyOn}
            />
            <FieldSwitch
              label="3.3% 세금 공제"
              checked={taxOn}
              onCheckedChange={setTaxOn}
            />
            <div className="space-y-2">
              <label className="t7 font-medium text-fg-tertiary ml-1">
                월급일 (매월)
              </label>
              <ResponsiveSelect
                value={payday}
                onValueChange={(v) => v != null && setPayday(v)}
                options={PAYDAY_SELECT_OPTIONS}
                placeholder="일 선택"
                triggerClassName="t6 h-11 rounded-control border-0 bg-background text-foreground w-full"
                contentClassName="max-h-60 rounded-control"
              />
            </div>
            <div className="space-y-2">
              <label className="t7 font-medium text-fg-tertiary ml-1">
                급여 기간
              </label>
              <ResponsiveSelect
                value={payMode}
                onValueChange={(v) => v != null && setPayMode(v)}
                options={PAY_PERIOD_SELECT_OPTIONS}
                placeholder="급여 기간 선택"
                triggerClassName="t6 h-11 rounded-control border-0 bg-background text-foreground w-full min-w-0"
                contentClassName="rounded-control max-w-[min(100vw-2rem,24rem)]"
                renderValue={(v) =>
                  v != null && v !== "" ? payPeriodModeLabel(v) : null
                }
              />
            </div>
            {error && <p className="t7 text-negative">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 rounded-control border-0 bg-divider text-foreground hover:bg-divider"
                onClick={() => {
                  setCreating(false);
                  setError(null);
                  resetPayrollForm();
                }}
              >
                닫기
              </Button>
              <Button type="submit" className="flex-1 rounded-control bg-primary font-bold text-primary-foreground" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "추가"}
              </Button>
            </div>
          </form>
          </div>,
          modalMount
        )}
    </div>
  );
}
