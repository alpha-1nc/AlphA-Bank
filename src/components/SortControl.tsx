"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet, ListRow, TextButton } from "@/components/ui";

export interface SortOption<K extends string> {
  value: K;
  label: string;
}

/**
 * 정렬 상태 버튼 → 바텀시트에서 선택. 선택값은 localStorage(storageKey)에 저장.
 * 첫 렌더는 기본값, 저장값은 마운트 이후에 읽어 hydration 불일치를 피한다.
 */
export function useSortState<K extends string>(storageKey: string, options: readonly SortOption<K>[]) {
  const [value, setValue] = useState<K>(options[0].value);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && options.some((o) => o.value === saved)) setValue(saved as K);
    } catch {
      /* 읽기 실패 시 기본값 */
    }
    // options 는 모듈 상수
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function update(next: K) {
    setValue(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* 저장 실패는 무시 */
    }
  }

  return [value, update] as const;
}

export function SortControl<K extends string>({
  value,
  options,
  onChange,
}: {
  value: K;
  options: readonly SortOption<K>[];
  onChange: (v: K) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? options[0].label;

  return (
    <div className="flex justify-end">
      <TextButton
        size="small"
        variant="arrow"
        aria-haspopup="dialog"
        aria-label={`정렬: ${current}`}
        onClick={() => setOpen(true)}
      >
        {current}
      </TextButton>
      <BottomSheet open={open} onClose={() => setOpen(false)} header={<BottomSheet.Header>정렬</BottomSheet.Header>}>
        <div className="pb-1">
          {options.map((o) => (
            <ListRow
              key={o.value}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              horizontalPadding="small"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              contents={<span className="t5 font-medium text-foreground">{o.label}</span>}
              right={o.value === value ? <Check className="h-5 w-5 text-primary" aria-label="선택됨" /> : undefined}
            />
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
