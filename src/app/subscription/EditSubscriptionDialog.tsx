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

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  category: string;
  memo: string | null;
}

interface Props {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSubscriptionDialog({ subscription, open, onOpenChange }: Props) {
  const [name, setName] = useState(subscription.name);
  const [amount, setAmount] = useState(String(subscription.amount));
  const [billingDay, setBillingDay] = useState(String(subscription.billingDay));
  const [category, setCategory] = useState(subscription.category);
  const [memo, setMemo] = useState(subscription.memo ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(subscription.name);
      setAmount(String(subscription.amount));
      setBillingDay(String(subscription.billingDay));
      setCategory(subscription.category);
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
        memo: memo || null,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-card">
        <DialogHeader>
          <DialogTitle className="t5 font-bold text-foreground">구독 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">서비스명 *</label>
            <Input
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="t7 font-medium text-fg-tertiary ml-1">월 결제금액 (원) *</label>
              <Input
                className="t6 h-11 rounded-control border-0 bg-background text-foreground"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="t7 font-medium text-fg-tertiary ml-1">결제일 *</label>
              <Input
                className="t6 h-11 rounded-control border-0 bg-background text-foreground"
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">카테고리 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="t6 h-11 w-full rounded-control border-0 bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SUBSCRIPTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">메모 (선택)</label>
            <Input
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" className="rounded-control bg-primary font-bold text-primary-foreground" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
