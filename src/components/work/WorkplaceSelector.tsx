"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { BottomSheet, Button, IconButton, ListRow, Switch, Tab, TextField, useToast } from "@/components/ui";
import { AMOUNT_INPUT_FORMAT } from "@/lib/number-input";
import {
  PAY_PERIOD_MODE,
  SALARY_PERIOD_MODE,
  payPeriodModeLabel,
} from "@/lib/work-pay-schedule";
import type { Workplace } from "@/generated/prisma";
import { createWorkplace } from "@/actions/workplace.actions";
import { WORKPLACE_TYPE } from "@/lib/workplace-type";

const PAYDAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const PAY_PERIOD_OPTIONS = [
  SALARY_PERIOD_MODE.CURRENT_MONTH,
  PAY_PERIOD_MODE.ROLLING_BEFORE_PAYDAY,
] as string[];

const DEFAULT_HOURLY = "10030";

type Step = "form" | "payday" | "payMode";

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
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [hourly, setHourly] = useState(DEFAULT_HOURLY);
  const [weeklyOn, setWeeklyOn] = useState(true);
  const [taxOn, setTaxOn] = useState(true);
  const [payday, setPayday] = useState("10");
  const [payMode, setPayMode] = useState<string>(PAY_PERIOD_MODE.CALENDAR_MONTH);
  const [hourlyError, setHourlyError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { openToast } = useToast();

  function resetForm() {
    setStep("form");
    setName("");
    setHourly(DEFAULT_HOURLY);
    setWeeklyOn(true);
    setTaxOn(true);
    setPayday("10");
    setPayMode(PAY_PERIOD_MODE.CALENDAR_MONTH);
    setHourlyError(null);
  }

  function handleClose() {
    setCreating(false);
    resetForm();
  }

  function submitCreate() {
    const wageNum = parseInt(hourly, 10);
    if (Number.isNaN(wageNum) || wageNum < 0) {
      setHourlyError("시급을 올바르게 입력해 주세요.");
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
        handleClose();
      } else {
        openToast(res.error, { type: "bottom" });
      }
    });
  }

  const subHeader = (title: string) => (
    <div className="flex items-center gap-1">
      <IconButton aria-label="뒤로가기" icon={ChevronLeft} variant="clear" iconSize={24} onClick={() => setStep("form")} />
      <BottomSheet.Header>{title}</BottomSheet.Header>
    </div>
  );

  const sheet = (
    <BottomSheet
      open={creating}
      onClose={handleClose}
      hasTextField
      header={
        step === "payday" ? subHeader("월급일 선택") : step === "payMode" ? subHeader("급여 기간 선택") : (
          <BottomSheet.Header>새 근무지</BottomSheet.Header>
        )
      }
      cta={
        step === "form" ? (
          <BottomSheet.CTA loading={pending} disabled={!name.trim()} onClick={submitCreate}>
            추가
          </BottomSheet.CTA>
        ) : undefined
      }
    >
      {step === "payday" ? (
        <div className="-mx-6 flex flex-col">
          {PAYDAY_OPTIONS.map((d) => (
            <ListRow
              key={d}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={`매월 ${d}일`} />}
              right={String(d) === payday ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => {
                setPayday(String(d));
                setStep("form");
              }}
            />
          ))}
        </div>
      ) : step === "payMode" ? (
        <div className="-mx-6 flex flex-col">
          {PAY_PERIOD_OPTIONS.map((m) => (
            <ListRow
              key={m}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={payPeriodModeLabel(m)} />}
              right={m === payMode ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => {
                setPayMode(m);
                setStep("form");
              }}
            />
          ))}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4 pb-1 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) submitCreate();
          }}
        >
          <TextField
            variant="box"
            label="근무지 이름"
            labelOption="sustain"
            placeholder="예: 편의점 A점"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            variant="box"
            label="시급"
            labelOption="sustain"
            type="text"
            inputMode="numeric"
            format={AMOUNT_INPUT_FORMAT}
            suffix="원"
            hasError={!!hourlyError}
            help={hourlyError ?? undefined}
            value={hourly}
            onChange={(e) => {
              setHourly(e.target.value);
              setHourlyError(null);
            }}
          />
          <ListRow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            contents={<span className="t5 font-medium text-foreground">주휴수당 적용</span>}
            right={<Switch aria-label="주휴수당 적용" checked={weeklyOn} onCheckedChange={setWeeklyOn} />}
          />
          <ListRow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            contents={<span className="t5 font-medium text-foreground">3.3% 세금 공제</span>}
            right={<Switch aria-label="3.3% 세금 공제" checked={taxOn} onCheckedChange={setTaxOn} />}
          />
          <ListRow
            withTouchEffect
            withArrow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            onClick={() => setStep("payday")}
            contents={<span className="t5 font-medium text-fg-tertiary">월급일 (매월)</span>}
            right={<span className="t5 font-medium text-foreground">매월 {payday}일</span>}
          />
          <ListRow
            withTouchEffect
            withArrow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            onClick={() => setStep("payMode")}
            contents={<span className="t5 font-medium text-fg-tertiary">급여 기간</span>}
            right={<span className="t5 font-medium text-foreground">{payPeriodModeLabel(payMode)}</span>}
          />
        </form>
      )}
    </BottomSheet>
  );

  if (active.length === 0) {
    return (
      <div className="rounded-card bg-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="t7 text-fg-tertiary mb-4">
          등록된 근무지가 없습니다. 첫 근무지를 추가해 주세요.
        </p>
        <Button size="medium" color="light" variant="fill" display="inline" onClick={() => setCreating(true)}>
          새 근무지 추가
        </Button>
        {sheet}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-0 flex-1">
        <Tab
          size="small"
          fluid
          itemGap={8}
          ariaLabel="근무지"
          onChange={(index) => {
            const w = active[index];
            if (w) onSelect(w.id);
          }}
        >
          {active.map((w) => (
            <Tab.Item key={w.id} selected={selectedId === w.id}>
              {w.name}
            </Tab.Item>
          ))}
        </Tab>
      </div>
      <Button size="medium" color="light" variant="fill" display="inline" onClick={() => setCreating(true)}>
        새 근무지 추가
      </Button>
      {sheet}
    </div>
  );
}
