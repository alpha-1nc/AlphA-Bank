"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { importPreviousFixedExpenses } from "@/app/actions/budget";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ImportPreviousFixedButtonProps {
  currentMonth: string;
}

export function ImportPreviousFixedButton({ currentMonth }: ImportPreviousFixedButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    startTransition(async () => {
      await importPreviousFixedExpenses(currentMonth);
      router.refresh();
    });
  }

  return (
    <Button
      variant="default"
      size="default"
      onClick={handleImport}
      disabled={isPending}
      className="rounded-full font-semibold shrink-0 h-8"
    >
      <Download className="h-3.5 w-3.5 mr-1.5" />
      {isPending ? "불러오는 중..." : "이전 달 불러오기"}
    </Button>
  );
}
