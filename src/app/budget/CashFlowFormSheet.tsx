"use client";

import { lazy, Suspense, useState, useTransition } from "react";
import { AMOUNT_INPUT_FORMAT } from "@/lib/number-input";
import { ChevronLeft, Plus } from "lucide-react";
import { BottomSheet, Button, IconButton, ListRow, SegmentedControl, TextButton, TextField } from "@/components/ui";
import { addCashFlow, updateCashFlow, type AddCashFlowData } from "@/app/actions/budget";
import {
  CASHFLOW_SECTIONS,
  CATEGORY_LABELS,
  SECTION_LABELS,
  getCategoryKeys,
  getDefaultCategory,
  normalizeEmoji,
  sectionHasCategories,
  type CashFlowSection,
} from "@/lib/cashflow-categories";

/** 전체 이모지 피커 — 이모지 단계로 들어갈 때만 로드 */
const EmojiPickerPanel = lazy(() => import("@/components/EmojiPickerPanel"));

export interface CashFlowItem {
  id: string;
  type: string;
  category: string | null;
  emoji: string | null;
  title: string;
  amount: number;
  isCompleted: boolean;
  /** 알바 근무지 실수령 동기화 항목 — 수정·삭제는 근무에서만 반영 */
  workplaceId?: string | null;
}

/** 저장된 type 이 알 수 없는 값이면 지출로 */
function toSection(type: string): CashFlowSection {
  return (CASHFLOW_SECTIONS as readonly string[]).includes(type) ? (type as CashFlowSection) : "EXPENSE";
}

function initialCategory(item: CashFlowItem | undefined, section: CashFlowSection | null): string | null {
  if (!section || !sectionHasCategories(section)) return null;
  if (item && getCategoryKeys(section).includes(item.category ?? "")) return item.category;
  return getDefaultCategory(section);
}

/** 내역 추가 / 수정 공용 시트. 구분 → 카테고리(분류별 선택지가 3개라 SegmentedControl) → 이모지(같은 시트 안 step 전환) */
export default function CashFlowFormSheet({
  item,
  monthlyBudgetId,
  open,
  onClose,
  onDelete,
}: {
  /** 있으면 수정, 없으면 추가 */
  item?: CashFlowItem;
  monthlyBudgetId: string;
  open: boolean;
  onClose: () => void;
  /** 수정 모드 전용: 확인을 받은 뒤 호출할 삭제 처리 */
  onDelete?: (item: CashFlowItem) => Promise<void> | void;
}) {
  const isEdit = !!item;
  const [pending, startTransition] = useTransition();
  const initialSection = item ? toSection(item.type) : null;
  const [type, setType] = useState<CashFlowSection | null>(initialSection);
  const [category, setCategory] = useState<string | null>(initialCategory(item, initialSection));
  const [emoji, setEmoji] = useState(item?.emoji ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [step, setStep] = useState<"form" | "emoji">("form");

  const parsedAmount = parseInt(amount, 10);
  const valid =
    !!type &&
    (!sectionHasCategories(type) || !!category) &&
    !!title.trim() &&
    !!amount.trim() &&
    !isNaN(parsedAmount) &&
    (isEdit ? parsedAmount >= 0 : parsedAmount > 0);

  function resetToInitial() {
    setStep("form");
    setType(initialSection);
    setCategory(initialCategory(item, initialSection));
    setEmoji(item?.emoji ?? "");
    setTitle(item?.title ?? "");
    setAmount(item ? String(item.amount) : "");
  }

  function handleClose() {
    onClose();
    resetToInitial();
  }

  function handleSectionChange(v: string) {
    const section = v as CashFlowSection;
    setType(section);
    setCategory(getDefaultCategory(section));
  }

  function handleSubmit() {
    if (!valid || !type) return;
    const base = {
      type,
      category: sectionHasCategories(type) ? category : null,
      emoji: emoji || null,
      title: title.trim(),
      amount: parsedAmount,
    };
    startTransition(async () => {
      if (item) {
        await updateCashFlow(item.id, base);
      } else {
        const data: AddCashFlowData = { ...base, monthlyBudgetId };
        await addCashFlow(data);
        resetToInitial();
      }
      onClose();
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      hasTextField
      header={
        step === "emoji" ? (
          <div className="flex items-center gap-1">
            <IconButton aria-label="뒤로가기" icon={ChevronLeft} variant="clear" iconSize={24} onClick={() => setStep("form")} />
            <BottomSheet.Header>이모지 선택</BottomSheet.Header>
          </div>
        ) : (
          <BottomSheet.Header>{isEdit ? "내역 수정" : "새 내역 추가"}</BottomSheet.Header>
        )
      }
      cta={
        step === "form" ? (
          <div className="flex flex-col gap-3">
            <BottomSheet.CTA loading={pending} disabled={!valid} onClick={handleSubmit}>
              저장
            </BottomSheet.CTA>
            {isEdit && item && onDelete && (
              <div className="flex justify-center">
                <TextButton
                  size="small"
                  variant="clear"
                  disabled={pending}
                  style={{ color: "var(--tk-negative)" }}
                  onClick={() => onDelete(item)}
                >
                  내역 삭제
                </TextButton>
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      {step === "emoji" ? (
        <div className="-mx-6 flex flex-col items-center gap-2 overflow-x-auto">
          <div className="flex w-full justify-end px-6">
            <Button
              size="small"
              color="light"
              variant="weak"
              disabled={!emoji}
              onClick={() => {
                setEmoji("");
                setStep("form");
              }}
            >
              지우기
            </Button>
          </div>
          <Suspense fallback={<div className="st12 flex h-48 items-center justify-center font-medium text-fg-tertiary">불러오는 중...</div>}>
            <EmojiPickerPanel
              theme={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"}
              onSelect={(native) => {
                setEmoji(normalizeEmoji(native) ?? "");
                setStep("form");
              }}
            />
          </Suspense>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-1 pt-2">
          <SegmentedControl size="large" alignment="fixed" value={type ?? ""} onChange={handleSectionChange} aria-label="구분">
            {CASHFLOW_SECTIONS.map((s) => (
              <SegmentedControl.Item key={s} value={s}>
                {SECTION_LABELS[s]}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl>
          {type && sectionHasCategories(type) && (
            <SegmentedControl size="large" alignment="fixed" value={category ?? ""} onChange={setCategory} aria-label="카테고리">
              {getCategoryKeys(type).map((key) => (
                <SegmentedControl.Item key={key} value={key}>
                  {(CATEGORY_LABELS[type] as Record<string, string>)[key]}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>
          )}
          <ListRow
            withTouchEffect
            withArrow
            border="none"
            horizontalPadding="small"
            className="rounded-control bg-divider"
            onClick={() => setStep("emoji")}
            contents={<span className="t5 font-medium text-fg-tertiary">이모지 (선택)</span>}
            right={
              emoji ? (
                <span className="text-lg leading-none">{emoji}</span>
              ) : (
                <Plus className="h-5 w-5 text-fg-tertiary" aria-hidden />
              )
            }
          />
          <TextField variant="box" label="내역" labelOption="sustain" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            variant="box"
            label="금액"
            labelOption="sustain"
            type="text"
            inputMode="numeric"
            format={AMOUNT_INPUT_FORMAT}
            suffix="원"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}
    </BottomSheet>
  );
}
