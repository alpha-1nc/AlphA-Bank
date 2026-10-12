"use client";

import { useState, useTransition } from "react";
import { toggleCashFlow, deleteCashFlow } from "@/app/actions/budget";
import { Button, Checkbox, ListRow, useDialog } from "@/components/ui";
import { CASHFLOW_SECTIONS, SECTION_LABELS, getCategoryLabel, type CashFlowSection } from "@/lib/cashflow-categories";
import { cn } from "@/lib/utils";
import { formatWon } from "@/lib/format-money";
import CashFlowFormSheet, { type CashFlowItem } from "./CashFlowFormSheet";

/** 금액 색: 수입·저축 positive / 지출 negative */
const SECTION_COLORS: Record<CashFlowSection, string> = {
  INCOME: "text-positive",
  EXPENSE: "text-negative",
  SAVING: "text-positive",
};

/** 예산 항목 한 줄 — 탭하면 수정 모달, 오른쪽 원형 체크로 집행 완료 토글 */
function CashFlowRow({
  item,
  section,
  last,
  pending,
  onEdit,
  onToggle,
}: {
  item: CashFlowItem;
  section: CashFlowSection;
  last: boolean;
  pending: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const done = item.isCompleted;
  const infoLine = [getCategoryLabel(item.type, item.category), item.workplaceId ? "알바" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow
      withTouchEffect
      border={last ? "none" : "indented"}
      verticalPadding="medium"
      className={cn(pending && "opacity-70")}
      /* 알바 동기화 항목은 근무에서만 수정 → 탭 동작 없음 */
      onClick={item.workplaceId ? undefined : onEdit}
      left={
        <span className="flex h-9 w-9 items-center justify-center text-[24px] leading-none" aria-hidden>
          {item.emoji ?? ""}
        </span>
      }
      contents={
        <div className="flex min-w-0 items-center gap-3">
          <ListRow.Texts
            type="2RowTypeA"
            className="min-w-0 flex-1"
            top={<span className={cn(done && "line-through text-fg-disabled")}>{item.title}</span>}
            bottom={<span className={cn(done && "text-fg-disabled")}>{infoLine}</span>}
          />
          <ListRow.Texts
            type="Right1RowTypeA"
            className="shrink-0"
            top={
              <span className={cn("numeric", done ? "line-through text-fg-disabled" : SECTION_COLORS[section])}>
                {section === "INCOME" ? "+" : "-"}
                {formatWon(item.amount)}
              </span>
            }
          />
        </div>
      }
      right={
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Checkbox.Circle
            checked={done}
            onCheckedChange={onToggle}
            aria-label={`집행 완료: ${item.title}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </span>
      }
    />
  );
}

interface CashFlowBoardProps {
  monthlyBudgetId: string;
  transactions: CashFlowItem[];
}

export function CashFlowBoard({ monthlyBudgetId, transactions }: CashFlowBoardProps) {
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<CashFlowItem | null>(null);
  const [togglePending, startToggleTransition] = useTransition();
  const { openConfirm } = useDialog();

  function handleToggle(item: CashFlowItem) {
    startToggleTransition(async () => {
      await toggleCashFlow(item.id, item.isCompleted);
    });
  }

  function handleDelete(id: string, workplaceId?: string | null) {
    if (workplaceId) return;
    startToggleTransition(async () => {
      await deleteCashFlow(id);
    });
  }

  function handleEdit(item: CashFlowItem) {
    if (item.workplaceId) return;
    setEditingItem(item);
  }

  async function handleDeleteWithConfirm(item: CashFlowItem) {
    const ok = await openConfirm({
      title: `"${item.title}" 내역을 삭제할까요?`,
      confirmButton: "삭제",
      cancelButton: "취소",
    });
    if (!ok) return;
    handleDelete(item.id, item.workplaceId);
    setEditingItem(null);
  }

  const grouped = CASHFLOW_SECTIONS.map((t) => ({
    type: t,
    label: SECTION_LABELS[t],
    items: transactions.filter((c) => c.type === t),
  }));

  return (
    <div className="space-y-7">
      <Button size="large" color="primary" variant="fill" display="block" onClick={() => setAdding(true)}>
        새 내역 추가
      </Button>
      <CashFlowFormSheet monthlyBudgetId={monthlyBudgetId} open={adding} onClose={() => setAdding(false)} />

      <div className="space-y-7">
        {grouped.map(({ type: groupType, label, items }) => (
          <div key={groupType} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2 px-1">
              <h3 className="t6 font-semibold text-foreground">{label}</h3>
              <span className="t7 numeric text-fg-tertiary">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <div className="rounded-card bg-card px-4 py-6 text-center">
                <p className="t7 text-fg-tertiary">{label} 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-card bg-card">
                {items.map((item, i) => (
                  <CashFlowRow
                    key={item.id}
                    item={item}
                    section={groupType}
                    last={i === items.length - 1}
                    pending={togglePending}
                    onEdit={() => handleEdit(item)}
                    onToggle={() => handleToggle(item)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {editingItem && (
        <CashFlowFormSheet
          key={editingItem.id}
          item={editingItem}
          monthlyBudgetId={monthlyBudgetId}
          open
          onClose={() => setEditingItem(null)}
          onDelete={handleDeleteWithConfirm}
        />
      )}
    </div>
  );
}
