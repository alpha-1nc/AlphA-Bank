"use client";

import { useRouter } from "next/navigation";
import { Tab, TextButton } from "@/components/ui";
import type { Workplace } from "@/generated/prisma";

type Props = {
  workplaces: Workplace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** 보고 있는 근무지를 고르는 탭. 근무지 추가·관리는 설정 화면에서 한다. */
export default function WorkplaceSelector({ workplaces, selectedId, onSelect }: Props) {
  const router = useRouter();
  const active = workplaces.filter((w) => w.isActive);

  if (active.length === 0) {
    return (
      <div className="rounded-card bg-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="t7 text-fg-tertiary mb-4">
          등록된 근무지가 없습니다. 설정에서 근무지를 추가해 주세요.
        </p>
        <TextButton size="small" variant="arrow" onClick={() => router.push("/settings")}>
          설정으로 이동
        </TextButton>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
  );
}
