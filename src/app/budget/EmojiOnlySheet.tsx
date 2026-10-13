"use client";

import { lazy, Suspense, useTransition } from "react";
import { BottomSheet, Button, useToast } from "@/components/ui";
import { updateCashFlowEmoji } from "@/app/actions/budget";
import { normalizeEmoji } from "@/lib/cashflow-categories";
import type { CashFlowItem } from "./CashFlowFormSheet";

const EmojiPickerPanel = lazy(() => import("@/components/EmojiPickerPanel"));

/** 알바 동기화 수입처럼 금액·제목을 못 바꾸는 항목의 이모지 전용 시트 */
export default function EmojiOnlySheet({ item, onClose }: { item: CashFlowItem; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const { openToast } = useToast();

  function save(emoji: string | null) {
    startTransition(async () => {
      await updateCashFlowEmoji(item.id, emoji);
      openToast(emoji ? "이모지를 변경했어요." : "이모지를 지웠어요.", { type: "bottom" });
      onClose();
    });
  }

  return (
    <BottomSheet open bodyFill onClose={onClose} header={<BottomSheet.Header>이모지 선택</BottomSheet.Header>}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 pb-1">
        <div className="min-h-[230px] w-full min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={<div className="st12 flex h-48 items-center justify-center font-medium text-fg-tertiary">불러오는 중...</div>}>
            <EmojiPickerPanel
              theme={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"}
              onSelect={(native) => !pending && save(normalizeEmoji(native))}
            />
          </Suspense>
        </div>
        <Button className="flex-none" size="small" color="light" variant="weak" display="block" disabled={!item.emoji || pending} onClick={() => save(null)}>
          지우기
        </Button>
      </div>
    </BottomSheet>
  );
}
