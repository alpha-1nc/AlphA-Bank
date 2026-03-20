"use client";

import { useState, useTransition } from "react";
import {
  addCashFlow,
  toggleCashFlow,
  deleteCashFlow,
  updateCashFlow,
  type AddCashFlowData,
} from "@/app/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2, Pencil } from "lucide-react";
import { ImportPreviousFixedButton } from "./ImportPreviousFixedButton";
import { TYPE_LABELS, type BudgetCashFlowType } from "@/lib/budget-constants";
import { cn } from "@/lib/utils";

/** 분류 드롭다운 옵션: 수입, 고정지출, 변동지출, 저축/투자 */
const ADDABLE_TYPES: BudgetCashFlowType[] = [
  "INCOME",
  "EXPENSE_FIXED",
  "EXPENSE_VAR",
  "SAVING",
];

const TYPE_GROUPS: BudgetCashFlowType[] = [
  "INCOME",
  "EXPENSE_FIXED",
  "EXPENSE_VAR",
  "SAVING",
];

const TYPE_COLORS: Record<BudgetCashFlowType, string> = {
  INCOME: "text-emerald-600",
  EXPENSE_FIXED: "text-red-600",
  EXPENSE_VAR: "text-red-600",
  SAVING: "text-amber-600",
};

interface Account {
  id: string;
  name: string;
  type: string;
}

interface CashFlowItem {
  id: string;
  type: string;
  title: string;
  amount: number;
  isCompleted: boolean;
  accountId: string | null;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CashFlowBoardProps {
  monthlyBudgetId: string;
  transactions: CashFlowItem[];
  accounts: Account[];
  currentMonth: string;
}

export function CashFlowBoard({ monthlyBudgetId, transactions, accounts, currentMonth }: CashFlowBoardProps) {
  const [type, setType] = useState<BudgetCashFlowType | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [togglePending, startToggleTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<CashFlowItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!type || !title.trim() || !amount.trim()) return;

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const data: AddCashFlowData = {
      type,
      title: title.trim(),
      amount: amountNum,
      monthlyBudgetId,
    };
    if (type === "SAVING" && accountId) {
      data.accountId = accountId;
    }

    setIsPending(true);
    try {
      await addCashFlow(data);
      setTitle("");
      setAmount("");
      setType(null);
      setAccountId(null);
    } finally {
      setIsPending(false);
    }
  }

  function handleToggle(item: CashFlowItem) {
    startToggleTransition(async () => {
      await toggleCashFlow(
        item.id,
        item.isCompleted,
        item.accountId,
        item.amount,
        item.type
      );
    });
  }

  function handleDelete(id: string) {
    startToggleTransition(async () => {
      await deleteCashFlow(id);
    });
  }

  function handleEdit(item: CashFlowItem) {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
    setEditAccountId(item.accountId);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editAmount.trim()) return;
    const amountNum = parseInt(editAmount, 10);
    if (isNaN(amountNum) || amountNum < 0) return;

    setEditPending(true);
    try {
      await updateCashFlow(editingItem.id, {
        title: editTitle.trim(),
        amount: amountNum,
        ...(editingItem.type === "SAVING" && { accountId: editAccountId }),
      });
      setEditingItem(null);
    } finally {
      setEditPending(false);
    }
  }

  const grouped = TYPE_GROUPS.map((t) => ({
    type: t,
    label: TYPE_LABELS[t],
    items: transactions.filter((c) => c.type === t),
  }));

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">분류</label>
          <Select
            value={type ?? ""}
            onValueChange={(v) => setType(v as BudgetCashFlowType)}
            items={TYPE_LABELS}
          >
            <SelectTrigger className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 dark:text-slate-100">
              <SelectValue placeholder="분류 선택">
                {(value: string | null) => (value && value in TYPE_LABELS ? TYPE_LABELS[value as BudgetCashFlowType] : null)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {ADDABLE_TYPES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {TYPE_LABELS[opt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">내역</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 dark:text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">금액 (원)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(
                "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 pl-8 font-black tracking-tighter dark:text-slate-100",
                type && TYPE_COLORS[type]
              )}
            />
          </div>
        </div>

        {type === "SAVING" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">입금 계좌</label>
            <Select value={accountId ?? ""} onValueChange={(v) => setAccountId(v || null)}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={type === "SAVING" ? "md:col-span-2" : ""}>
          <Button
            type="submit"
            disabled={isPending || !type || !title.trim() || !amount.trim()}
            className="w-full bg-gradient-to-br from-primary to-primary/90 text-white font-bold py-3 rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-all h-11"
          >
            {isPending ? "추가 중..." : "추가"}
          </Button>
        </div>
      </form>

      <div className="space-y-5">
        {grouped.map(({ type: groupType, label, items }) => (
          <div
            key={groupType}
            className="bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${TYPE_GROUPS.indexOf(groupType) * 75}ms` } as React.CSSProperties}
          >
            <div className="px-6 md:px-8 py-4 border-b border-slate-50 dark:border-white/5 flex justify-between items-center gap-3">
              <h3 className="text-sm font-black tracking-tighter text-slate-800 dark:text-slate-200">{label}</h3>
              {groupType === "EXPENSE_FIXED" && (
                <ImportPreviousFixedButton currentMonth={currentMonth} />
              )}
            </div>
            {items.length === 0 ? (
              <div className="px-8 py-10 text-center">
                <p className="text-sm font-medium text-slate-400">
                  {label} 내역이 없습니다.
                </p>
              </div>
            ) : (
              <>
                {/* 모바일: 카드 레이아웃 (가로 스크롤 없음) */}
                <div className="md:hidden space-y-2 p-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-3",
                        item.isCompleted && "opacity-70",
                        togglePending && "opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => handleToggle(item)}
                          aria-label={`집행 완료: ${item.title}`}
                          className="rounded-md border-slate-300 shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <p
                          className={cn(
                            "text-sm font-semibold truncate",
                            item.isCompleted ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                          )}
                          title={item.title}
                        >
                          {item.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-sm font-black tracking-tighter tabular-nums",
                            TYPE_COLORS[groupType as BudgetCashFlowType],
                            item.isCompleted && "line-through opacity-50"
                          )}
                        >
                          {groupType === "INCOME" ? "+" : "-"}
                          {formatKRW(item.amount)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => handleEdit(item)}
                            disabled={togglePending}
                            aria-label={`수정: ${item.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
                            onClick={() => handleDelete(item.id)}
                            disabled={togglePending}
                            aria-label={`삭제: ${item.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 웹: 테이블 */}
                <div className="hidden md:block overflow-hidden">
                  <Table>
                    <TableHeader>
                    <TableRow className="bg-slate-50/60 dark:bg-white/5 hover:bg-transparent border-b border-slate-100 dark:border-white/5">
                      <TableHead className="px-6 md:px-8 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest w-16">
                        집행
                      </TableHead>
                      <TableHead className="px-6 md:px-8 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        내역
                      </TableHead>
                      <TableHead className="px-6 md:px-8 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right">
                        금액
                      </TableHead>
                      <TableHead className="px-6 md:px-8 py-3 w-24 text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0",
                          item.isCompleted && "bg-slate-50/40 dark:bg-white/5",
                          togglePending && "opacity-70"
                        )}
                      >
                        <TableCell className="px-6 md:px-8 py-4">
                          <Checkbox
                            checked={item.isCompleted}
                            onCheckedChange={() => handleToggle(item)}
                            aria-label={`집행 완료: ${item.title}`}
                            className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-6 md:px-8 py-4 font-semibold text-slate-700 dark:text-slate-300 min-w-0 max-w-[140px] sm:max-w-none truncate",
                            item.isCompleted && "line-through text-slate-400 dark:text-slate-500"
                          )}
                          title={item.title}
                        >
                          {item.title}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-6 md:px-8 py-4 text-right font-black tracking-tighter",
                            TYPE_COLORS[groupType as BudgetCashFlowType],
                            item.isCompleted && "line-through opacity-50"
                          )}
                        >
                          {groupType === "INCOME" ? "+" : "-"}
                          {formatKRW(item.amount)}
                        </TableCell>
                        <TableCell className="px-6 md:px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors active:scale-[0.98] transition-transform duration-150"
                              onClick={() => handleEdit(item)}
                              disabled={togglePending}
                              aria-label={`수정: ${item.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors active:scale-[0.98] transition-transform duration-150"
                              onClick={() => handleDelete(item.id)}
                              disabled={togglePending}
                              aria-label={`삭제: ${item.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
        <DialogContent className="sm:max-w-md rounded-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-black tracking-tighter">내역 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">내역</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 dark:text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">금액 (원)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
                  <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="pl-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 font-black tracking-tighter dark:text-slate-100"
                />
              </div>
            </div>
            {editingItem?.type === "SAVING" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">입금 계좌</label>
                <Select value={editAccountId ?? ""} onValueChange={(v) => setEditAccountId(v || null)}>
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl h-11 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
                className="rounded-full"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={editPending || !editTitle.trim() || !editAmount.trim()}
                className="rounded-full bg-gradient-to-br from-primary to-primary/90 text-white font-bold"
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
