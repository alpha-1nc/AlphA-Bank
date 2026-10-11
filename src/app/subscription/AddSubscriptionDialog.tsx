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

interface Props {
  trigger: React.ReactElement;
}

export default function AddSubscriptionDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [category, setCategory] = useState(SUBSCRIPTION_CATEGORIES[0]);
  const [memo, setMemo] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setAmount("");
    setBillingDay("1");
    setCategory(SUBSCRIPTION_CATEGORIES[0]);
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
        memo: memo || null,
      });
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md rounded-card">
        <DialogHeader>
          <DialogTitle className="t5 font-bold text-foreground">새 구독 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">서비스명 *</label>
            <Input
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
              placeholder="예: Netflix, Spotify"
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
                placeholder="예: 17000"
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
                placeholder="1~31"
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
              onChange={(e) => setCategory(e.target.value as typeof category)}
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
              placeholder="메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" className="rounded-control bg-primary font-bold text-primary-foreground" disabled={isPending}>
              {isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
