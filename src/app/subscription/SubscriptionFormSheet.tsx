"use client";

import { useState, useTransition } from "react";
import { AMOUNT_INPUT_FORMAT } from "@/lib/number-input";
import { Check, ChevronLeft } from "lucide-react";
import { BottomSheet, Button, IconButton, ListRow, TextButton, TextField, useDialog, useToast } from "@/components/ui";
import {
  addSubscription,
  updateSubscription,
  deleteSubscription,
  addSubscriptionToBudget,
} from "@/app/actions/subscription";
import { SUBSCRIPTION_CATEGORIES } from "@/lib/subscription-constants";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  memo: string | null;
}

/** 구독 추가 / 수정 공용 시트 */
export default function SubscriptionFormSheet({
  subscription,
  open,
  onClose,
  currentBudgetMonth,
  isReflected = false,
  onReflected,
}: {
  /** 있으면 수정, 없으면 추가 */
  subscription?: Subscription;
  open: boolean;
  onClose: () => void;
  /** 수정 모드의 "이 구독만 예산 반영"에 쓰임 */
  currentBudgetMonth?: string;
  isReflected?: boolean;
  onReflected?: () => void;
}) {
  const isEdit = !!subscription;
  const [pending, startTransition] = useTransition();
  const [reflecting, startReflect] = useTransition();
  const [deleting, startDelete] = useTransition();
  const { openToast } = useToast();
  const { openConfirm } = useDialog();
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : "");
  const [billingDay, setBillingDay] = useState(subscription ? String(subscription.billingDay) : "1");
  const [category, setCategory] = useState<string>(subscription?.category ?? SUBSCRIPTION_CATEGORIES[0]);
  const [memo, setMemo] = useState(subscription?.memo ?? "");
  const [step, setStep] = useState<"form" | "category">("form");

  const parsedAmount = parseInt(amount, 10);
  const parsedDay = parseInt(billingDay, 10);
  const valid =
    !!name.trim() &&
    !isNaN(parsedAmount) &&
    parsedAmount >= 0 &&
    !isNaN(parsedDay) &&
    parsedDay >= 1 &&
    parsedDay <= 31;

  function resetToInitial() {
    setStep("form");
    setName(subscription?.name ?? "");
    setAmount(subscription ? String(subscription.amount) : "");
    setBillingDay(subscription ? String(subscription.billingDay) : "1");
    setCategory(subscription?.category ?? SUBSCRIPTION_CATEGORIES[0]);
    setMemo(subscription?.memo ?? "");
  }

  function handleClose() {
    onClose();
    resetToInitial();
  }

  function handleSubmit() {
    if (!valid) return;

    startTransition(async () => {
      const data = {
        name: name.trim(),
        amount: parsedAmount,
        billingDay: parsedDay,
        category,
        memo: memo || null,
      };
      if (subscription) {
        await updateSubscription(subscription.id, data);
      } else {
        await addSubscription(data);
        resetToInitial();
      }
      onClose();
    });
  }

  function handleReflect() {
    if (!subscription || !currentBudgetMonth) return;
    startReflect(async () => {
      const result = await addSubscriptionToBudget(subscription.id, currentBudgetMonth);
      if (result.alreadyExists) {
        openToast(`"${subscription.name}"은 이미 이번 달 예산에 반영되어 있습니다.`, { type: "bottom" });
      } else if (result.success) {
        onReflected?.();
        openToast(`"${subscription.name}"을(를) 이번 달 예산에 반영했습니다.`, { type: "bottom" });
      }
    });
  }

  async function handleDelete() {
    if (!subscription) return;
    const ok = await openConfirm({
      title: `"${subscription.name}" 구독을 삭제할까요?`,
      confirmButton: "삭제",
      cancelButton: "취소",
    });
    if (!ok) return;
    startDelete(async () => {
      await deleteSubscription(subscription.id);
      onClose();
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      hasTextField
      header={
        step === "category" ? (
          <div className="flex items-center gap-1">
            <IconButton aria-label="뒤로가기" icon={ChevronLeft} variant="clear" iconSize={24} onClick={() => setStep("form")} />
            <BottomSheet.Header>카테고리 선택</BottomSheet.Header>
          </div>
        ) : (
          <BottomSheet.Header>{isEdit ? "구독 수정" : "새 구독 추가"}</BottomSheet.Header>
        )
      }
      cta={
        step === "form" ? (
          <div className="flex flex-col gap-3">
            {isEdit && (
              <Button
                size="medium"
                color="light"
                variant="fill"
                display="block"
                loading={reflecting}
                disabled={isReflected}
                onClick={handleReflect}
              >
                이 구독만 예산 반영
              </Button>
            )}
            <BottomSheet.CTA loading={pending} disabled={!valid} onClick={handleSubmit}>
              저장
            </BottomSheet.CTA>
            {isEdit && (
              <div className="flex justify-center">
                <TextButton
                  size="small"
                  variant="clear"
                  disabled={deleting}
                  style={{ color: "var(--tk-negative)" }}
                  onClick={handleDelete}
                >
                  구독 삭제
                </TextButton>
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      {step === "category" ? (
        <div className="-mx-6 flex flex-col">
          {SUBSCRIPTION_CATEGORIES.map((c) => (
            <ListRow
              key={c}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={c} />}
              right={c === category ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => {
                setCategory(c);
                setStep("form");
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-1 pt-2">
          <TextField
            variant="box"
            label="서비스명"
            labelOption="sustain"
            placeholder="예: Netflix, Spotify"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            variant="box"
            label="월 결제금액"
            labelOption="sustain"
            type="text"
            inputMode="numeric"
            format={AMOUNT_INPUT_FORMAT}
            suffix="원"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            variant="box"
            label="결제일 (1~31)"
            labelOption="sustain"
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
          />
          <ListRow
            withTouchEffect
            withArrow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            onClick={() => setStep("category")}
            contents={<span className="t5 font-medium text-fg-tertiary">카테고리</span>}
            right={<span className="t5 font-medium text-foreground">{category}</span>}
          />
          <TextField
            variant="box"
            label="메모 (선택)"
            labelOption="sustain"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
      )}
    </BottomSheet>
  );
}
