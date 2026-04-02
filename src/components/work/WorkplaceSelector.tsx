"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { PAY_PERIOD_MODE, payPeriodModeLabel } from "@/lib/work-pay-schedule";
import type { Workplace } from "@/generated/prisma";
import { createWorkplace } from "@/actions/workplace.actions";
import {
  FieldSwitch,
  HourlyWageField,
} from "@/components/work/PayrollFormFields";

const PAYDAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const PRESET_COLORS = [
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#9b59b6",
  "#f39c12",
  "#1abc9c",
  "#e91e63",
  "#607d8b",
];

type Props = {
  userId: string;
  workplaces: Workplace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onWorkplaceCreated: (w: Workplace) => void;
};

export default function WorkplaceSelector({
  userId,
  workplaces,
  selectedId,
  onSelect,
  onWorkplaceCreated,
}: Props) {
  const active = workplaces.filter((w) => w.isActive);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [hourly, setHourly] = useState("10030");
  const [weeklyOn, setWeeklyOn] = useState(true);
  const [taxOn, setTaxOn] = useState(true);
  const [payday, setPayday] = useState("10");
  const [payMode, setPayMode] = useState<string>(PAY_PERIOD_MODE.CALENDAR_MONTH);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetPayrollForm() {
    setHourly("10030");
    setWeeklyOn(true);
    setTaxOn(true);
    setPayday("10");
    setPayMode(PAY_PERIOD_MODE.CALENDAR_MONTH);
  }

  if (active.length === 0 && !creating) {
    return (
      <div className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-sm text-muted-foreground mb-4">
          등록된 근무지가 없습니다. 첫 근무지를 추가해 주세요.
        </p>
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl border-slate-100 dark:border-white/10"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          근무지 추가
        </Button>
      </div>
    );
  }

  if (active.length === 0 && creating) {
    return (
      <form
        className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 transition-all duration-300 ease-out hover:shadow-xl animate-in fade-in zoom-in-95 duration-300"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const wageNum = parseInt(hourly, 10);
          if (Number.isNaN(wageNum) || wageNum < 0) {
            setError("시급을 올바르게 입력해 주세요.");
            return;
          }
          startTransition(async () => {
            const res = await createWorkplace({
              userId,
              name: name.trim(),
              color,
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
              setColor(PRESET_COLORS[0]);
              resetPayrollForm();
            } else {
              setError(res.error);
            }
          });
        }}
      >
        <p className="text-sm font-medium text-foreground">새 근무지</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">이름</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 편의점 A점"
            className="rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">색상</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform duration-150 hover:scale-110",
                  color === c ? "ring-primary" : "ring-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`색 ${c}`}
              />
            ))}
          </div>
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              월급일 (매월)
            </label>
            <Select
              value={payday}
              onValueChange={(v) => v && setPayday(v)}
            >
              <SelectTrigger className="rounded-xl w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {PAYDAY_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    매월 {d}일
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              급여 기간
            </label>
            <Select
              value={payMode}
              onValueChange={(v) => v && setPayMode(v)}
            >
              <SelectTrigger className="rounded-xl w-full min-w-0">
                <SelectValue placeholder="급여 기간 선택">
                  {payPeriodModeLabel(payMode)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl max-w-[min(100vw-2rem,24rem)]">
                <SelectItem value={PAY_PERIOD_MODE.CALENDAR_MONTH}>
                  {payPeriodModeLabel(PAY_PERIOD_MODE.CALENDAR_MONTH)}
                </SelectItem>
                <SelectItem value={PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY}>
                  {payPeriodModeLabel(
                    PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-2xl"
            onClick={() => {
              setCreating(false);
              setError(null);
              resetPayrollForm();
            }}
          >
            취소
          </Button>
          <Button type="submit" className="rounded-2xl flex-1" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        {active.map((w) => {
          const isSel = selectedId === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w.id)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200 border",
                isSel
                  ? "border-primary/40 bg-primary/15 text-primary shadow-md scale-[1.02] ring-2 ring-primary/20"
                  : "border-slate-100 dark:border-white/10 bg-white/80 dark:bg-white/5 text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/10 hover:text-foreground hover:border-primary/20 active:scale-[0.98]"
              )}
            >
              <span className="relative inline-flex h-2.5 w-2.5 mr-2 align-middle shrink-0">
                {isSel && (
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: w.color }}
                    aria-hidden
                  />
                )}
                <span
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: w.color }}
                />
              </span>
              {w.name}
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-2xl shrink-0 border-slate-100 dark:border-white/10"
        onClick={() => setCreating(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        근무지 추가
      </Button>
      {creating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in-0">
          <form
            className="w-full max-w-sm max-h-[min(90vh,720px)] overflow-y-auto rounded-3xl border border-slate-100 dark:border-white/10 bg-background p-6 shadow-xl space-y-4 animate-in zoom-in-95"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const wageNum = parseInt(hourly, 10);
              if (Number.isNaN(wageNum) || wageNum < 0) {
                setError("시급을 올바르게 입력해 주세요.");
                return;
              }
              startTransition(async () => {
                const res = await createWorkplace({
                  userId,
                  name: name.trim(),
                  color,
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
                  setColor(PRESET_COLORS[0]);
                  resetPayrollForm();
                } else {
                  setError(res.error);
                }
              });
            }}
          >
            <p className="text-sm font-semibold">새 근무지</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="근무지 이름"
              className="rounded-xl"
              required
            />
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background",
                    color === c ? "ring-primary" : "ring-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                월급일 (매월)
              </label>
              <Select
              value={payday}
              onValueChange={(v) => v && setPayday(v)}
            >
                <SelectTrigger className="rounded-xl w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
                  {PAYDAY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      매월 {d}일
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                급여 기간
              </label>
              <Select
              value={payMode}
              onValueChange={(v) => v && setPayMode(v)}
            >
                <SelectTrigger className="rounded-xl w-full min-w-0">
                  <SelectValue placeholder="급여 기간 선택">
                    {payPeriodModeLabel(payMode)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl max-w-[min(100vw-2rem,24rem)]">
                  <SelectItem value={PAY_PERIOD_MODE.CALENDAR_MONTH}>
                    {payPeriodModeLabel(PAY_PERIOD_MODE.CALENDAR_MONTH)}
                  </SelectItem>
                  <SelectItem value={PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY}>
                    {payPeriodModeLabel(
                      PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 rounded-2xl"
                onClick={() => {
                  setCreating(false);
                  setError(null);
                  resetPayrollForm();
                }}
              >
                닫기
              </Button>
              <Button type="submit" className="flex-1 rounded-2xl" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "추가"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
