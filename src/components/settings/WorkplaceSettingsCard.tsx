"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  initialWorkplaces: Workplace[];
};

export default function WorkplaceSettingsCard({ initialWorkplaces }: Props) {
  const router = useRouter();
  const [workplaces, setWorkplaces] = useState(initialWorkplaces);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [name, setName] = useState("");
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
      <div className="rounded-card bg-card p-6 md:p-7 flex flex-col gap-6 md:col-span-2">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-6 shrink-0 items-center justify-center">
            <Briefcase className="h-5 w-5 text-fg-tertiary" />
          </div>
          <div>
            <h2 className="t5 font-bold text-foreground">
              근무지
            </h2>
            <p className="t7 text-fg-tertiary mt-1">
              시급·세금·주휴·월급일·급여 기간·재직 여부를 관리합니다. 시급/세금/주휴
              저장 시 해당 근무지의 모든 근무 기록에도 동일하게 반영됩니다.
            </p>
          </div>
        </div>

        <div className="h-px bg-divider" />

        {error && !editing && (
          <p className="t7 text-negative" role="alert">
            {error}
          </p>
        )}

        {workplaces.length === 0 ? (
          <p className="t7 text-fg-tertiary">
            등록된 근무지가 없습니다. 아르바이트 급여 화면에서 근무지를 추가해
            주세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {workplaces.map((w) => (
              <li
                key={w.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-control bg-background px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="t6 font-bold text-foreground truncate">
                      {w.name}
                    </p>
                    <p className="t7 numeric text-fg-tertiary">
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
                    className="rounded-control border-0 bg-divider text-foreground hover:bg-divider"
                    onClick={() => openEdit(w)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-control border-0 bg-transparent text-negative hover:bg-divider"
                    onClick={() => handleDeleteWorkplace(w)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="sm:max-w-lg max-h-none overflow-hidden rounded-card p-4 sm:p-5 gap-0">
          <DialogHeader className="pb-3 space-y-0">
            <DialogTitle className="t5 font-bold text-foreground">
              근무지 수정
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <form
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3 pt-0"
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
                <label className="t7 font-medium text-fg-tertiary">
                  이름
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="t6 h-9 rounded-control border-0 bg-background text-foreground"
                  required
                />
              </div>

              <div className="sm:col-span-2 [&_label]:text-xs [&_input]:h-9">
                <HourlyWageField
                  id="settings-wp-hourly"
                  value={hourly}
                  onChange={setHourly}
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 [&>div]:rounded-control [&>div]:py-2 [&>div]:px-3 [&>div>span]:text-xs">
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
                <label className="t7 font-medium text-fg-tertiary">
                  월급일 (매월)
                </label>
                <ResponsiveSelect
                  value={payday}
                  onValueChange={(v) => v != null && setPayday(v)}
                  options={PAYDAY_SELECT_OPTIONS}
                  placeholder="일 선택"
                  size="sm"
                  triggerClassName="t6 rounded-control border-0 bg-background w-full h-9"
                  contentClassName="max-h-60 rounded-control"
                />
              </div>
              <div className="space-y-1">
                <label className="t7 font-medium text-fg-tertiary">
                  급여 기간
                </label>
                <ResponsiveSelect
                  value={payMode}
                  onValueChange={(v) => v != null && setPayMode(v)}
                  options={PAY_PERIOD_SELECT_OPTIONS}
                  placeholder="급여 기간 선택"
                  size="sm"
                  triggerClassName="t6 rounded-control border-0 bg-background w-full h-9 min-w-0"
                  contentClassName="rounded-control max-w-[min(100vw-2rem,24rem)]"
                  renderValue={(v) =>
                    v != null && v !== "" ? payPeriodModeLabel(v) : null
                  }
                />
              </div>

              {error && (
                <p
                  className="t7 text-negative sm:col-span-2"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-control border-0 bg-transparent text-negative hover:bg-divider sm:mr-auto"
                  onClick={() => editing && handleDeleteWorkplace(editing)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  근무지 삭제
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-control border-0 bg-divider text-foreground hover:bg-divider flex-1"
                  onClick={closeEdit}
                  disabled={pending}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="rounded-control flex-1 bg-primary font-bold text-primary-foreground"
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
