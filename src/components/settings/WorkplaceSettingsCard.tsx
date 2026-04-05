"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Workplace } from "@/generated/prisma";
import { WORKPLACE_DEFAULTS } from "@/lib/workplace-client";
import { deleteWorkplace, updateWorkplace } from "@/actions/workplace.actions";
import {
  FieldSwitch,
  HourlyWageField,
} from "@/components/work/PayrollFormFields";
import {
  PAY_PERIOD_MODE,
  SALARY_PERIOD_MODE,
  payPeriodModeLabel,
} from "@/lib/work-pay-schedule";

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
  initialWorkplaces: Workplace[];
};

export default function WorkplaceSettingsCard({ initialWorkplaces }: Props) {
  const router = useRouter();
  const [workplaces, setWorkplaces] = useState(initialWorkplaces);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [hourly, setHourly] = useState(String(WORKPLACE_DEFAULTS.hourlyWage));
  const [weeklyOn, setWeeklyOn] = useState(true);
  const [taxOn, setTaxOn] = useState(true);
  const [active, setActive] = useState(true);
  const [payday, setPayday] = useState("10");
  const [payMode, setPayMode] = useState<string>(PAY_PERIOD_MODE.CALENDAR_MONTH);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setWorkplaces(initialWorkplaces);
  }, [initialWorkplaces]);

  function openEdit(w: Workplace) {
    setEditing(w);
    setName(w.name);
    setColor(w.color);
    setHourly(String(w.hourlyWage ?? WORKPLACE_DEFAULTS.hourlyWage));
    setWeeklyOn(w.isWeeklyAllowanceActive ?? WORKPLACE_DEFAULTS.isWeeklyAllowanceActive);
    setTaxOn(w.isTaxActive ?? WORKPLACE_DEFAULTS.isTaxActive);
    setActive(w.isActive ?? WORKPLACE_DEFAULTS.isActive);
    setPayday(String(w.paydayOfMonth ?? WORKPLACE_DEFAULTS.paydayOfMonth));
    setPayMode(
      (w.payPeriodMode ?? WORKPLACE_DEFAULTS.payPeriodMode) ===
        PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
        ? PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
        : PAY_PERIOD_MODE.CALENDAR_MONTH
    );
    setError(null);
  }

  function closeEdit() {
    setEditing(null);
    setError(null);
  }

  function handleActiveToggle(next: boolean) {
    if (!next && active) {
      if (
        !window.confirm(
          "퇴사 처리하면 이 근무지는 급여 화면에서 선택할 수 없습니다. 계속할까요?"
        )
      ) {
        return;
      }
    }
    setActive(next);
  }

  function handleDeleteWorkplace(w: Workplace) {
    if (
      !window.confirm(
        `「${w.name}」 근무지를 삭제할까요? 이 근무지의 모든 근무 기록이 함께 삭제되며 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteWorkplace(w.id);
      if (res.success) {
        setWorkplaces((prev) => prev.filter((x) => x.id !== w.id));
        if (editing?.id === w.id) closeEdit();
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <div className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col gap-6 md:col-span-2">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              근무지
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              시급·세금·주휴·월급일·급여 기간·재직 여부를 관리합니다. 시급/세금/주휴
              저장 시 해당 근무지의 모든 근무 기록에도 동일하게 반영됩니다.
            </p>
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-white/5" />

        {error && !editing && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {workplaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            등록된 근무지가 없습니다. 아르바이트 급여 화면에서 근무지를 추가해
            주세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {workplaces.map((w) => (
              <li
                key={w.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-100 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-800"
                    style={{ backgroundColor: w.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {w.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      시급 {(w.hourlyWage ?? WORKPLACE_DEFAULTS.hourlyWage).toLocaleString()}원
                      · 매월 {w.paydayOfMonth ?? WORKPLACE_DEFAULTS.paydayOfMonth}일 월급
                      {w.isActive ? " · 재직" : " · 퇴사"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl border-slate-200 dark:border-white/10"
                    onClick={() => openEdit(w)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => handleDeleteWorkplace(w)}
                    disabled={pending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="sm:max-w-lg max-h-none overflow-hidden rounded-3xl border-slate-100 dark:border-white/10 p-4 sm:p-5 gap-0">
          <DialogHeader className="pb-3 space-y-0">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight">
              근무지 수정
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <form
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5 pt-0"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                const parsed = parseInt(hourly, 10);
                const fallbackWage =
                  editing.hourlyWage ?? WORKPLACE_DEFAULTS.hourlyWage;
                const wageNum =
                  !active &&
                  (Number.isNaN(parsed) || parsed < 0)
                    ? fallbackWage
                    : parsed;
                if (active && (Number.isNaN(parsed) || parsed < 0)) {
                  setError("시급을 올바르게 입력해 주세요.");
                  return;
                }
                startTransition(async () => {
                  const res = await updateWorkplace({
                    workplaceId: editing.id,
                    name: name.trim(),
                    color,
                    type: (editing.type ?? "PARTTIME") as "PARTTIME" | "FULLTIME",
                    hourlyWage: wageNum,
                    isWeeklyAllowanceActive: weeklyOn,
                    isTaxActive: taxOn,
                    isActive: active,
                    paydayOfMonth: parseInt(payday, 10),
                    payPeriodMode: payMode,
                  });
                  if (res.success) {
                    setWorkplaces((prev) =>
                      prev.map((x) => (x.id === res.data.id ? res.data : x))
                    );
                    router.refresh();
                    closeEdit();
                  } else {
                    setError(res.error);
                  }
                });
              }}
            >
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  이름
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl h-9"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  색상
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background",
                        color === c ? "ring-primary" : "ring-transparent"
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      aria-label={`색 ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 [&_label]:text-xs [&_input]:h-9">
                <HourlyWageField
                  id="settings-wp-hourly"
                  value={hourly}
                  onChange={setHourly}
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 [&>div]:rounded-xl [&>div]:py-1.5 [&>div]:px-2.5 [&>div>span]:text-xs">
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
                <FieldSwitch
                  label="재직 중"
                  checked={active}
                  onCheckedChange={handleActiveToggle}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  월급일 (매월)
                </label>
                <Select
                  value={payday}
                  onValueChange={(v) => v != null && setPayday(v)}
                >
                  <SelectTrigger className="rounded-xl w-full h-9 text-sm">
                    <SelectValue placeholder="일 선택" />
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  급여 기간
                </label>
                <Select
                  value={payMode}
                  onValueChange={(v) => v != null && setPayMode(v)}
                >
                  <SelectTrigger className="rounded-xl w-full h-9 text-sm min-w-0">
                    <SelectValue placeholder="급여 기간 선택">
                      {payPeriodModeLabel(payMode)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-w-[min(100vw-2rem,24rem)]">
                    <SelectItem value={SALARY_PERIOD_MODE.CURRENT_MONTH}>
                      {payPeriodModeLabel(SALARY_PERIOD_MODE.CURRENT_MONTH)}
                    </SelectItem>
                    <SelectItem
                      value={PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY}
                    >
                      {payPeriodModeLabel(
                        PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY
                      )}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p
                  className="text-sm text-destructive sm:col-span-2"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 sm:mr-auto"
                  onClick={() => editing && handleDeleteWorkplace(editing)}
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  근무지 삭제
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl flex-1"
                  onClick={closeEdit}
                  disabled={pending}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="rounded-2xl flex-1"
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "저장"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
