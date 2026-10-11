"use client";

import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import {
  addCashFlow,
  toggleCashFlow,
  deleteCashFlow,
  updateCashFlow,
  type AddCashFlowData,
} from "@/app/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Pencil, Plus } from "lucide-react";
import {
  CASHFLOW_SECTIONS,
  CATEGORY_LABELS,
  SECTION_LABELS,
  getCategoryKeys,
  getCategoryLabel,
  getDefaultCategory,
  normalizeEmoji,
  sectionHasCategories,
  type CashFlowSection,
} from "@/lib/cashflow-categories";
import { cn } from "@/lib/utils";
import { formatWon } from "@/lib/format-money";

/** 전체 이모지 피커 — 팝오버를 열 때만 로드 */
const EmojiPickerPanel = lazy(() => import("@/components/EmojiPickerPanel"));

const PICKER_WIDTH = 330;
const PICKER_HEIGHT = 450;

/** 금액 색: 수입·저축 positive / 지출 negative */
const SECTION_COLORS: Record<CashFlowSection, string> = {
  INCOME: "text-positive",
  EXPENSE: "text-negative",
  SAVING: "text-positive",
};

const SELECT_TRIGGER_CLASS =
  "t6 h-11 min-h-11 w-full rounded-control border-0 bg-background text-foreground md:h-11 md:min-h-11 md:data-[size=default]:h-11 md:data-[size=default]:min-h-11";

const INPUT_CLASS =
  "t6 h-11 min-h-11 rounded-control border-0 bg-background text-foreground md:h-11 md:min-h-11";

const FIELD_LABEL_CLASS = "t7 font-medium text-fg-tertiary ml-1";

/** 카테고리·알바 뱃지: 무채색 pill */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="t8 shrink-0 rounded-pill bg-divider px-2 py-0.5 font-medium text-fg-secondary">
      {children}
    </span>
  );
}

function categoryOptions(section: CashFlowSection) {
  return getCategoryKeys(section).map((key) => ({
    value: key,
    label: (CATEGORY_LABELS[section] as Record<string, string>)[key],
  }));
}

/**
 * 이모지 선택: 버튼 → emoji-mart 피커(검색·한국어). 선택 사항.
 * inline=true(수정 모달)이면 모달 안에서 잘리지 않도록 폼 흐름 안에 펼치고,
 * 아니면 버튼 아래(공간이 없으면 위)에 화면 가장자리를 피해 띄운다.
 */
function EmojiField({
  value,
  onChange,
  inline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [pos, setPos] = useState<{ left: number; up: boolean }>({ left: 0, up: false });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || inline || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const margin = 8;
    const desiredLeft = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, window.innerWidth - PICKER_WIDTH - margin)
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setPos({
      left: desiredLeft - rect.left,
      up: spaceBelow < PICKER_HEIGHT + margin && spaceAbove > spaceBelow,
    });
  }, [open, inline]);

  function toggle() {
    if (!open) setDark(document.documentElement.classList.contains("dark"));
    setOpen((o) => !o);
  }

  const panel = (
    <div
      className={cn(
        "space-y-2 rounded-control border border-divider bg-card p-2",
        inline ? "mt-2 w-fit max-w-full" : "absolute z-[60]"
      )}
      style={
        inline
          ? undefined
          : { left: pos.left, width: PICKER_WIDTH, ...(pos.up ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }) }
      }
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          disabled={!value}
          className="t8 h-8 rounded-pill px-3 font-semibold text-fg-tertiary hover:text-negative transition-colors disabled:opacity-40 disabled:hover:text-fg-tertiary"
        >
          지우기
        </button>
      </div>
      <Suspense
        fallback={
          <div className="t8 flex h-48 items-center justify-center font-medium text-fg-tertiary">
            불러오는 중...
          </div>
        }
      >
        <EmojiPickerPanel
          theme={dark ? "dark" : "light"}
          onSelect={(native) => {
            onChange(normalizeEmoji(native) ?? "");
            setOpen(false);
          }}
        />
      </Suspense>
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative", inline && "w-full")}>
      <div className={cn(inline && "w-14")}>
        <button
          type="button"
          onClick={toggle}
          aria-label="이모지 선택"
          aria-expanded={open}
          className="flex h-11 min-h-11 w-full items-center justify-center rounded-control bg-background text-lg text-foreground md:h-11 md:min-h-11"
        >
          {value ? value : <Plus className="h-4 w-4 text-fg-tertiary" aria-hidden />}
        </button>
      </div>
      {open && panel}
    </div>
  );
}

interface CashFlowItem {
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

/** 모바일/데스크톱 높이에 맞추고, 단위 "원"을 입력란 오른쪽에 붙임 */
function KrwAmountField({
  id,
  value,
  onChange,
  tintClassName,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  tintClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 h-11 w-full items-stretch rounded-control bg-background",
        "focus-within:ring-2 focus-within:ring-primary/20",
        "md:h-11 md:min-h-11"
      )}
    >
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="금액"
        className={cn(
          "t6 numeric min-h-0 h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-0 font-bold text-foreground",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0 md:h-full",
          tintClassName
        )}
      />
      <label
        htmlFor={id}
        className="t6 flex shrink-0 cursor-text select-none items-center px-4 font-medium text-fg-tertiary"
      >
        원
      </label>
    </div>
  );
}

interface CashFlowBoardProps {
  monthlyBudgetId: string;
  transactions: CashFlowItem[];
}

export function CashFlowBoard({ monthlyBudgetId, transactions }: CashFlowBoardProps) {
  const [type, setType] = useState<CashFlowSection | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [emoji, setEmoji] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [togglePending, startToggleTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<CashFlowItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<CashFlowSection>("EXPENSE");
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editEmoji, setEditEmoji] = useState("");
  const [editPending, setEditPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!type || !title.trim() || !amount.trim()) return;
    if (sectionHasCategories(type) && !category) return;

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const data: AddCashFlowData = {
      type,
      category: sectionHasCategories(type) ? category : null,
      emoji: emoji || null,
      title: title.trim(),
      amount: amountNum,
      monthlyBudgetId,
    };

    setIsPending(true);
    try {
      await addCashFlow(data);
      setTitle("");
      setAmount("");
      setType(null);
      setCategory(null);
      setEmoji("");
    } finally {
      setIsPending(false);
    }
  }

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
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
    const section = (CASHFLOW_SECTIONS as readonly string[]).includes(item.type)
      ? (item.type as CashFlowSection)
      : "EXPENSE";
    setEditType(section);
    setEditCategory(
      sectionHasCategories(section)
        ? getCategoryKeys(section).includes(item.category ?? "")
          ? item.category
          : getDefaultCategory(section)
        : null
    );
    setEditEmoji(item.emoji ?? "");
  }

  function handleSectionChange(section: CashFlowSection) {
    setType(section);
    setCategory(getDefaultCategory(section));
  }

  function handleEditSectionChange(section: CashFlowSection) {
    setEditType(section);
    setEditCategory(getDefaultCategory(section));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editAmount.trim()) return;
    const amountNum = parseInt(editAmount, 10);
    if (isNaN(amountNum) || amountNum < 0) return;
    if (sectionHasCategories(editType) && !editCategory) return;

    setEditPending(true);
    try {
      await updateCashFlow(editingItem.id, {
        title: editTitle.trim(),
        amount: amountNum,
        type: editType,
        category: sectionHasCategories(editType) ? editCategory : null,
        emoji: editEmoji || null,
      });
      setEditingItem(null);
    } finally {
      setEditPending(false);
    }
  }

  const grouped = CASHFLOW_SECTIONS.map((t) => ({
    type: t,
    label: SECTION_LABELS[t],
    items: transactions.filter((c) => c.type === t),
  }));

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 lg:flex-nowrap"
      >
        <div className="min-w-[8rem] flex-1 space-y-2 lg:w-32 lg:flex-none">
          <label className={FIELD_LABEL_CLASS}>분류</label>
          <ResponsiveSelect
            value={type ?? ""}
            onValueChange={(v) => handleSectionChange(v as CashFlowSection)}
            options={CASHFLOW_SECTIONS.map((opt) => ({
              value: opt,
              label: SECTION_LABELS[opt],
            }))}
            placeholder="분류 선택"
            triggerClassName={SELECT_TRIGGER_CLASS}
            contentClassName="rounded-control"
          />
        </div>

        {type && sectionHasCategories(type) && (
          <div className="min-w-[8rem] flex-1 space-y-2 lg:w-32 lg:flex-none">
            <label className={FIELD_LABEL_CLASS}>카테고리</label>
            <ResponsiveSelect
              value={category ?? ""}
              onValueChange={(v) => setCategory(v || null)}
              options={categoryOptions(type)}
              placeholder="카테고리 선택"
              triggerClassName={SELECT_TRIGGER_CLASS}
              contentClassName="rounded-control"
            />
          </div>
        )}

        <div className="w-14 shrink-0 space-y-2">
          <label className={FIELD_LABEL_CLASS}>이모지</label>
          <EmojiField value={emoji} onChange={setEmoji} />
        </div>

        <div className="min-w-[10rem] flex-1 space-y-2 lg:min-w-0">
          <label className={FIELD_LABEL_CLASS}>내역</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="min-w-[10rem] flex-1 space-y-2 lg:w-44 lg:flex-none">
          <label className={FIELD_LABEL_CLASS}>금액</label>
          <KrwAmountField
            id="budget-add-amount"
            value={amount}
            onChange={setAmount}
            tintClassName={type ? SECTION_COLORS[type] : undefined}
          />
        </div>

        <div className="w-24 shrink-0 lg:w-20">
          <Button
            type="submit"
            disabled={
              isPending ||
              !type ||
              (sectionHasCategories(type) && !category) ||
              !title.trim() ||
              !amount.trim()
            }
            className="t6 h-11 w-full rounded-control bg-primary font-bold text-primary-foreground hover:opacity-90 transition-all"
          >
            {isPending ? "추가 중..." : "추가"}
          </Button>
        </div>
      </form>

      <div className="space-y-5">
        {grouped.map(({ type: groupType, label, items }) => (
          <div
            key={groupType}
            className="rounded-card border border-divider bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${CASHFLOW_SECTIONS.indexOf(groupType) * 75}ms` } as React.CSSProperties}
          >
            <div className="px-5 md:px-7 py-4 border-b border-divider flex items-baseline gap-2">
              <h3 className="t5 font-bold text-foreground">{label}</h3>
              <span className="t7 numeric text-fg-tertiary">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <div className="px-7 py-7 text-center">
                <p className="t6 text-fg-tertiary">
                  {label} 내역이 없습니다.
                </p>
              </div>
            ) : (
              <>
                {/* 모바일: 카드 레이아웃 (가로 스크롤 없음) — 1줄: 체크·이모지·제목·작업, 2줄: 뱃지·금액 */}
                <div className="md:hidden space-y-3 p-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-control bg-background p-4",
                        togglePending && "opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => handleToggle(item)}
                          aria-label={`집행 완료: ${item.title}`}
                          className="h-5 w-5 rounded-md border-fg-disabled shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="w-6 shrink-0 text-center text-lg leading-none" aria-hidden>
                          {item.emoji ?? ""}
                        </span>
                        <p
                          className={cn(
                            "t6 min-w-0 flex-1 font-semibold truncate",
                            item.isCompleted ? "line-through text-fg-disabled" : "text-foreground"
                          )}
                          title={item.title}
                        >
                          {item.title}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {!item.workplaceId && (
                            <>
                              <button
                                type="button"
                                className="h-9 w-9 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-primary hover:bg-accent-soft transition-colors touch-manipulation"
                                onClick={() => handleEdit(item)}
                                disabled={togglePending}
                                aria-label={`수정: ${item.title}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="h-9 w-9 flex items-center justify-center rounded-pill text-fg-tertiary hover:text-negative hover:bg-divider transition-colors touch-manipulation"
                                onClick={() => handleDelete(item.id)}
                                disabled={togglePending}
                                aria-label={`삭제: ${item.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pl-[68px] min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {getCategoryLabel(item.type, item.category) && (
                            <Pill>{getCategoryLabel(item.type, item.category)}</Pill>
                          )}
                          {item.workplaceId && (
                            <Pill>알바</Pill>
                          )}
                        </div>
                        <span
                          className={cn(
                            "t6 numeric ml-auto font-bold",
                            item.isCompleted ? "line-through text-fg-disabled" : SECTION_COLORS[groupType]
                          )}
                        >
                          {groupType === "INCOME" ? "+" : "-"}
                          {formatWon(item.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 웹: 테이블 */}
                <div className="hidden md:block overflow-hidden">
                  <Table>
                    <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-divider">
                      <TableHead className="t7 px-6 md:px-7 py-3 font-medium text-fg-tertiary w-16">
                        집행
                      </TableHead>
                      <TableHead className="t7 px-6 md:px-7 py-3 font-medium text-fg-tertiary">
                        내역
                      </TableHead>
                      <TableHead className="t7 px-6 md:px-7 py-3 font-medium text-fg-tertiary text-right">
                        금액
                      </TableHead>
                      <TableHead className="t7 px-6 md:px-7 py-3 w-24 font-medium text-fg-tertiary text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "hover:bg-background transition-colors border-b border-divider last:border-0",
                          togglePending && "opacity-70"
                        )}
                      >
                        <TableCell className="px-6 md:px-7 py-4">
                          <Checkbox
                            checked={item.isCompleted}
                            onCheckedChange={() => handleToggle(item)}
                            aria-label={`집행 완료: ${item.title}`}
                            className="rounded-md border-fg-disabled data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "t6 px-6 md:px-7 py-4 font-semibold min-w-0 max-w-[140px] sm:max-w-none",
                            item.isCompleted ? "line-through text-fg-disabled" : "text-foreground"
                          )}
                          title={item.title}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 shrink-0 text-center text-lg leading-none" aria-hidden>
                              {item.emoji ?? ""}
                            </span>
                            <span className="truncate">{item.title}</span>
                            {getCategoryLabel(item.type, item.category) && (
                              <Pill>{getCategoryLabel(item.type, item.category)}</Pill>
                            )}
                            {item.workplaceId && (
                              <Pill>알바</Pill>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "t6 numeric px-6 md:px-7 py-4 text-right font-bold",
                            item.isCompleted ? "line-through text-fg-disabled" : SECTION_COLORS[groupType]
                          )}
                        >
                          {groupType === "INCOME" ? "+" : "-"}
                          {formatWon(item.amount)}
                        </TableCell>
                        <TableCell className="px-6 md:px-7 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!item.workplaceId && (
                              <>
                                <button
                                  type="button"
                                  className="p-2 rounded-pill text-fg-tertiary hover:text-primary hover:bg-accent-soft transition-colors active:scale-[0.98] transition-transform duration-150"
                                  onClick={() => handleEdit(item)}
                                  disabled={togglePending}
                                  aria-label={`수정: ${item.title}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-2 rounded-pill text-fg-tertiary hover:text-negative hover:bg-divider transition-colors active:scale-[0.98] transition-transform duration-150"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={togglePending}
                                  aria-label={`삭제: ${item.title}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-card" showCloseButton>
          <DialogHeader>
            <DialogTitle className="t5 font-bold text-foreground">내역 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <label className={FIELD_LABEL_CLASS}>내역</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <label className={FIELD_LABEL_CLASS}>금액</label>
              <KrwAmountField
                id="budget-edit-amount"
                value={editAmount}
                onChange={setEditAmount}
              />
            </div>
            <div className="space-y-2">
              <label className={FIELD_LABEL_CLASS}>분류</label>
              <ResponsiveSelect
                value={editType}
                onValueChange={(v) => handleEditSectionChange(v as CashFlowSection)}
                options={CASHFLOW_SECTIONS.map((opt) => ({
                  value: opt,
                  label: SECTION_LABELS[opt],
                }))}
                triggerClassName={SELECT_TRIGGER_CLASS}
                contentClassName="rounded-control"
              />
            </div>
            {sectionHasCategories(editType) && (
              <div className="space-y-2">
                <label className={FIELD_LABEL_CLASS}>카테고리</label>
                <ResponsiveSelect
                  value={editCategory ?? ""}
                  onValueChange={(v) => setEditCategory(v || null)}
                  options={categoryOptions(editType)}
                  placeholder="카테고리 선택"
                  triggerClassName={SELECT_TRIGGER_CLASS}
                  contentClassName="rounded-control"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className={FIELD_LABEL_CLASS}>이모지</label>
              <EmojiField value={editEmoji} onChange={setEditEmoji} inline />
            </div>
            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
                className="rounded-control border-0 bg-divider text-foreground hover:bg-divider"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={
                  editPending ||
                  (sectionHasCategories(editType) && !editCategory) ||
                  !editTitle.trim() ||
                  !editAmount.trim()
                }
                className="rounded-control bg-primary font-bold text-primary-foreground"
              >
                {editPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
