"use client";

import { useEffect, useState, useTransition } from "react";
import { AMOUNT_INPUT_FORMAT } from "@/lib/number-input";
import { useRouter } from "next/navigation";
import { Briefcase, Check, ChevronLeft } from "lucide-react";
import {
  BottomSheet,
  ConfirmDialog,
  IconButton,
  ListRow,
  Switch,
  TextButton,
  TextField,
  useDialog,
} from "@/components/ui";
import type { Workplace } from "@/generated/prisma";
import { WORKPLACE_DEFAULTS } from "@/lib/workplace-client";
import { deleteWorkplace, updateWorkplace } from "@/actions/workplace.actions";
import {
  PAY_PERIOD_MODE,
  SALARY_PERIOD_MODE,
  payPeriodModeLabel,
} from "@/lib/work-pay-schedule";
import SettingsSection, { SettingsIconBox } from "@/components/settings/SettingsSection";

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

type Step = "form" | "payday" | "payMode";

function negativeConfirm(label: string) {
  return (
    <ConfirmDialog.ConfirmButton color="light" variant="fill" style={{ color: "var(--tk-negative)" }}>
      {label}
    </ConfirmDialog.ConfirmButton>
  );
}

/** Switch 를 누를 때 행의 onClick 이 같이 실행되지 않도록 */
const stopProps = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
};

export default function WorkplaceSettingsCard({ initialWorkplaces }: Props) {
  const router = useRouter();
  const { openConfirm } = useDialog();
  const [workplaces, setWorkplaces] = useState(initialWorkplaces);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
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
    setStep("form");
    setSheetOpen(true);
  }

  function closeEdit() {
    setSheetOpen(false);
    setError(null);
  }

  async function handleActiveToggle(next: boolean) {
    if (!next && active) {
      const ok = await openConfirm({
        title: "퇴사 처리하시겠습니까?",
        description: "이 근무지는 급여 화면에서 선택할 수 없습니다.",
        confirmButton: "퇴사 처리",
        cancelButton: "취소",
      });
      if (!ok) return;
    }
    setActive(next);
  }

  async function handleDeleteWorkplace(w: Workplace) {
    const ok = await openConfirm({
      title: `「${w.name}」 근무지를 삭제하시겠습니까?`,
      description: "이 근무지의 모든 근무 기록이 함께 삭제되며 되돌릴 수 없습니다.",
      confirmButton: negativeConfirm("삭제"),
      cancelButton: "취소",
    });
    if (!ok) return;
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

  function handleSave() {
    if (!editing) return;
    setError(null);
    const parsed = parseInt(hourly, 10);
    const fallbackWage = editing.hourlyWage ?? WORKPLACE_DEFAULTS.hourlyWage;
    const wageNum = !active && (Number.isNaN(parsed) || parsed < 0) ? fallbackWage : parsed;
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
        setWorkplaces((prev) => prev.map((x) => (x.id === res.data.id ? res.data : x)));
        router.refresh();
        closeEdit();
      } else {
        setError(res.error);
      }
    });
  }

  const backHeader = (title: string) => (
    <div className="flex items-center gap-1">
      <IconButton aria-label="뒤로가기" icon={ChevronLeft} variant="clear" iconSize={24} onClick={() => setStep("form")} />
      <BottomSheet.Header>{title}</BottomSheet.Header>
    </div>
  );

  function pickRow(key: string, label: string, selected: boolean, onPick: () => void) {
    return (
      <ListRow
        key={key}
        withTouchEffect
        border="none"
        verticalPadding="medium"
        contents={<ListRow.Texts type="1RowTypeA" top={label} />}
        right={selected ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
        onClick={onPick}
      />
    );
  }

  return (
    <>
      <SettingsSection
        title="근무지"
        note="시급·세금·주휴·월급일·급여 기간·재직 여부를 관리합니다. 시급/세금/주휴 저장 시 해당 근무지의 모든 근무 기록에도 동일하게 반영됩니다."
      >
        {workplaces.length === 0 ? (
          <p className="t7 px-6 py-6 text-center text-fg-tertiary">
            등록된 근무지가 없습니다. 아르바이트 급여 화면에서 근무지를 추가해 주세요.
          </p>
        ) : (
          workplaces.map((w, i) => (
            <ListRow
              key={w.id}
              withTouchEffect
              withArrow
              border={i === workplaces.length - 1 ? "none" : "indented"}
              verticalPadding="medium"
              onClick={() => openEdit(w)}
              left={
                <SettingsIconBox>
                  <Briefcase className="h-5 w-5 text-fg-tertiary" aria-hidden />
                </SettingsIconBox>
              }
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={w.name}
                  bottom={
                    <span className="numeric">
                      시급 {(w.hourlyWage ?? WORKPLACE_DEFAULTS.hourlyWage).toLocaleString()}원 · 매월{" "}
                      {w.paydayOfMonth ?? WORKPLACE_DEFAULTS.paydayOfMonth}일 월급
                      {w.isActive ? " · 재직" : " · 퇴사"}
                    </span>
                  }
                />
              }
            />
          ))
        )}
      </SettingsSection>
      {error && !sheetOpen && (
        <p className="t7 -mt-4 px-1 text-negative" role="alert">
          {error}
        </p>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={closeEdit}
        hasTextField
        header={
          step === "payday" ? (
            backHeader("월급일")
          ) : step === "payMode" ? (
            backHeader("급여 기간")
          ) : (
            <BottomSheet.Header>근무지 수정</BottomSheet.Header>
          )
        }
        cta={
          step === "form" ? (
            <div className="flex flex-col gap-3">
              <BottomSheet.CTA loading={pending} disabled={!name.trim()} onClick={handleSave}>
                저장
              </BottomSheet.CTA>
              <div className="flex justify-center">
                <TextButton
                  size="small"
                  variant="clear"
                  disabled={pending}
                  style={{ color: "var(--tk-negative)" }}
                  onClick={() => editing && handleDeleteWorkplace(editing)}
                >
                  근무지 삭제
                </TextButton>
              </div>
            </div>
          ) : undefined
        }
      >
        {step === "payday" ? (
          <div className="-mx-6 flex flex-col">
            {PAYDAY_SELECT_OPTIONS.map((o) =>
              pickRow(o.value, o.label, o.value === payday, () => {
                setPayday(o.value);
                setStep("form");
              })
            )}
          </div>
        ) : step === "payMode" ? (
          <div className="-mx-6 flex flex-col">
            {PAY_PERIOD_SELECT_OPTIONS.map((o) =>
              pickRow(o.value, o.label, o.value === payMode, () => {
                setPayMode(o.value);
                setStep("form");
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-1 pt-2">
            <TextField variant="box" label="이름" labelOption="sustain" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              variant="box"
              label="시급"
              labelOption="sustain"
              type="text"
              inputMode="numeric"
              format={AMOUNT_INPUT_FORMAT}
              suffix="원"
              value={hourly}
              onChange={(e) => setHourly(e.target.value)}
            />
            <div className="-mx-6 flex flex-col">
              <ListRow
                border="none"
                verticalPadding="medium"
                contents={<ListRow.Texts type="1RowTypeA" top="주휴수당 적용" />}
                right={<Switch aria-label="주휴수당 적용" checked={weeklyOn} onCheckedChange={setWeeklyOn} {...stopProps} />}
              />
              <ListRow
                border="none"
                verticalPadding="medium"
                contents={<ListRow.Texts type="1RowTypeA" top="3.3% 세금 공제" />}
                right={<Switch aria-label="3.3% 세금 공제" checked={taxOn} onCheckedChange={setTaxOn} {...stopProps} />}
              />
              <ListRow
                border="none"
                verticalPadding="medium"
                contents={<ListRow.Texts type="1RowTypeA" top="재직 중" />}
                right={<Switch aria-label="재직 중" checked={active} onCheckedChange={handleActiveToggle} {...stopProps} />}
              />
              <ListRow
                withTouchEffect
                withArrow
                border="none"
                verticalPadding="medium"
                onClick={() => setStep("payday")}
                contents={<ListRow.Texts type="1RowTypeA" top="월급일" />}
                right={<span className="t5 numeric font-medium text-fg-secondary">매월 {payday}일</span>}
              />
              <ListRow
                withTouchEffect
                withArrow
                border="none"
                verticalPadding="medium"
                onClick={() => setStep("payMode")}
                contents={<ListRow.Texts type="1RowTypeA" top="급여 기간" />}
                right={<span className="t5 font-medium text-fg-secondary">{payPeriodModeLabel(payMode)}</span>}
              />
            </div>
            {error && (
              <p className="t7 text-negative" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
