"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSubscription } from "@/app/actions/subscription";
import { SUBSCRIPTION_CATEGORIES } from "@/lib/subscription-constants";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Props {
  trigger: React.ReactElement;
  accounts: Account[];
}

export default function AddSubscriptionDialog({ trigger, accounts }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [category, setCategory] = useState(SUBSCRIPTION_CATEGORIES[0]);
  const [accountId, setAccountId] = useState("");
  const [memo, setMemo] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setAmount("");
    setBillingDay("1");
    setCategory(SUBSCRIPTION_CATEGORIES[0]);
    setAccountId("");
    setMemo("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    const parsedDay = parseInt(billingDay, 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount < 0) return;
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) return;

    startTransition(async () => {
      await addSubscription({
        name: name.trim(),
        amount: parsedAmount,
        billingDay: parsedDay,
        category,
        accountId: accountId || null,
        memo: memo || null,
      });
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 구독 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">서비스명 *</label>
            <Input
              placeholder="예: Netflix, Spotify"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">월 결제금액 (원) *</label>
              <Input
                type="number"
                min="0"
                placeholder="예: 17000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">결제일 *</label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="1~31"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">카테고리 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {SUBSCRIPTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">결제 계좌 (선택)</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">계좌 없음</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">메모 (선택)</label>
            <Input
              placeholder="메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
