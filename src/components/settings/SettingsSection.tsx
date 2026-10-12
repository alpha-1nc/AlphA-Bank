import type { ReactNode } from "react";

/** 설정 화면의 섹션: 제목(선택) + 둥근 카드 + 아래 설명(선택). 카드 안 마지막 행만 border="none" */
export default function SettingsSection({
  title,
  note,
  children,
}: {
  title?: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="t6 px-1 font-semibold text-foreground">{title}</h2>}
      <div className="overflow-hidden rounded-card bg-card">{children}</div>
      {note && <p className="t7 px-1 text-fg-tertiary">{note}</p>}
    </section>
  );
}

/** 행 왼쪽 아이콘 박스 (SubscriptionBoard 와 동일 규격) */
export function SettingsIconBox({ children }: { children: ReactNode }) {
  return <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-divider">{children}</span>;
}
