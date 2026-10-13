"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toggleCashFlow, deleteCashFlow } from "@/app/actions/budget";
import { Button, Checkbox, ListRow, useDialog } from "@/components/ui";
import { CASHFLOW_SECTIONS, SECTION_LABELS, getCategoryLabel, type CashFlowSection } from "@/lib/cashflow-categories";
import { cn } from "@/lib/utils";
import { formatWon } from "@/lib/format-money";
import { SortControl, useSortState, type SortOption } from "@/components/SortControl";
import EmojiOnlySheet from "./EmojiOnlySheet";
import CashFlowFormSheet, { type CashFlowItem } from "./CashFlowFormSheet";

type BudgetSort = "amountDesc" | "amountAsc" | "created";
const SORT_OPTIONS: readonly SortOption<BudgetSort>[] = [
  { value: "amountDesc", label: "금액 큰 순" },
  { value: "amountAsc", label: "금액 작은 순" },
  { value: "created", label: "등록순" },
];

/** 금액 색: 수입·저축 positive / 지출 negative */
const SECTION_COLORS: Record<CashFlowSection, string> = {
  INCOME: "text-positive",
  EXPENSE: "text-negative",
  SAVING: "text-positive",
};

/** 금액 정렬은 동액이면 원래(등록) 순서 유지 — Array.sort 는 stable */
function sortItems(items: CashFlowItem[], sort: BudgetSort): CashFlowItem[] {
  if (sort === "created") return items;
  const dir = sort === "amountDesc" ? -1 : 1;
  return [...items].sort((a, b) => dir * (a.amount - b.amount));
}

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
      /* 알바 동기화 항목은 금액·제목을 근무에서만 수정 → 탭하면 이모지 전용 시트 */
      onClick={onEdit}
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
  /** 정렬 컨트롤과 같은 줄 왼쪽에 놓을 요소 */
  toolbarLeft?: ReactNode;
}

export function CashFlowBoard({ monthlyBudgetId, transactions, toolbarLeft }: CashFlowBoardProps) {
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<CashFlowItem | null>(null);
  const [emojiItem, setEmojiItem] = useState<CashFlowItem | null>(null);
  const [togglePending, startToggleTransition] = useTransition();
  const { openConfirm } = useDialog();
  const [sort, setSort] = useSortState("alpha-bank:budget-sort", SORT_OPTIONS);

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
    if (item.workplaceId) setEmojiItem(item);
    else setEditingItem(item);
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
    // 서버가 createdAt 오름차순으로 내려주므로 filter 결과 순서 = 등록순. 완료 여부는 정렬에 반영하지 않음
    items: sortItems(transactions.filter((c) => c.type === t), sort),
  }));

  return (
    <div className="space-y-7">
      <Button size="large" color="primary" variant="fill" display="block" onClick={() => setAdding(true)}>
        새 내역 추가
      </Button>
      <CashFlowFormSheet monthlyBudgetId={monthlyBudgetId} open={adding} onClose={() => setAdding(false)} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{toolbarLeft}</div>
        <div className="shrink-0">
          <SortControl value={sort} options={SORT_OPTIONS} onChange={setSort} />
        </div>
      </div>

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

      {emojiItem && <EmojiOnlySheet key={emojiItem.id} item={emojiItem} onClose={() => setEmojiItem(null)} />}

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
