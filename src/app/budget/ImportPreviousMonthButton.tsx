"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importPreviousMonthItems } from "@/app/actions/budget";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ImportPreviousMonthButtonProps {
  currentMonth: string;
}

export function ImportPreviousMonthButton({ currentMonth }: ImportPreviousMonthButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleImport() {
    if (
      !window.confirm(
        "지난달의 지출·저축·투자 항목을 이번 달로 불러올까요?\n이미 있는 항목(같은 분류·내역)은 건너뛰고, 기존 항목은 삭제되지 않습니다."
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await importPreviousMonthItems(currentMonth);
      setMessage(
        result.noSource
          ? "지난달에 불러올 지출·저축·투자 항목이 없습니다."
          : `${result.added}건 추가, ${result.skipped}건 건너뜀`
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {message && <p className="t7 text-fg-tertiary">{message}</p>}
      <Button
        variant="default"
        size="default"
        onClick={handleImport}
        disabled={isPending}
        className="t7 h-8 shrink-0 rounded-control bg-primary font-semibold text-primary-foreground"
      >
        <Download className="h-4 w-4 mr-1" />
        {isPending ? "불러오는 중..." : "지난달 전체 불러오기"}
      </Button>
    </div>
  );
}
