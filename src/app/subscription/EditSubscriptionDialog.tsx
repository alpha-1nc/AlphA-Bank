"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSubscription } from "@/app/actions/subscription";
import { SUBSCRIPTION_CATEGORIES } from "@/lib/subscription-constants";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  accountId: string | null;
  memo: string | null;
}

interface Props {
  subscription: Subscription;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSubscriptionDialog({ subscription, accounts, open, onOpenChange }: Props) {
  const [name, setName] = useState(subscription.name);
  const [amount, setAmount] = useState(String(subscription.amount));
  const [billingDay, setBillingDay] = useState(String(subscription.billingDay));
  const [category, setCategory] = useState(subscription.category);
  const [accountId, setAccountId] = useState(subscription.accountId ?? "");
  const [memo, setMemo] = useState(subscription.memo ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(subscription.name);
      setAmount(String(subscription.amount));
      setBillingDay(String(subscription.billingDay));
      setCategory(subscription.category);
      setAccountId(subscription.accountId ?? "");
      setMemo(subscription.memo ?? "");
    }
  }, [open, subscription]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    const parsedDay = parseInt(billingDay, 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount < 0) return;
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) return;

    startTransition(async () => {
      await updateSubscription(subscription.id, {
        name: name.trim(),
        amount: parsedAmount,
        billingDay: parsedDay,
        category,
        accountId: accountId || null,
        memo: memo || null,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>구독 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">서비스명 *</label>
            <Input
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
              onChange={(e) => setCategory(e.target.value)}
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
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
