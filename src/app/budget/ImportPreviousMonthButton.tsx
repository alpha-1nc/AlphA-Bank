"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { importPreviousMonthItems } from "@/app/actions/budget";
import { Button, useDialog, useToast } from "@/components/ui";
import { Download } from "lucide-react";

interface ImportPreviousMonthButtonProps {
  currentMonth: string;
}

export function ImportPreviousMonthButton({ currentMonth }: ImportPreviousMonthButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { openConfirm } = useDialog();
  const { openToast } = useToast();

  async function handleImport() {
    const ok = await openConfirm({
      title: "지난달의 지출·저축·투자 항목을 이번 달로 불러올까요?",
      description: "이미 있는 항목(같은 분류·내역)은 건너뛰고, 기존 항목은 삭제되지 않습니다.",
      confirmButton: "불러오기",
      cancelButton: "취소",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await importPreviousMonthItems(currentMonth);
      openToast(
        result.noSource
          ? "지난달에 불러올 지출·저축·투자 항목이 없습니다."
          : `${result.added}건 추가, ${result.skipped}건 건너뜀`,
        { type: "bottom" },
      );
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end">
      <Button size="medium" color="light" variant="fill" display="inline" loading={isPending} onClick={handleImport}>
        <Download className="h-4 w-4" aria-hidden />
        지난달 전체 불러오기
      </Button>
    </div>
  );
}
