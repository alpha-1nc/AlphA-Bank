"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Landmark,
  Banknote,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  Vault,
} from "lucide-react";
import Image from "next/image";
import { addAccount, updateAccountBalance, deleteAccount } from "@/app/actions/asset";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/asset-constants";
import { getBanksByType, getBankLogoPath } from "@/lib/bank-constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  description: string | null;
  initialBalance: number;
}

interface GroupedAccounts {
  [type: string]: Account[];
}

interface Props {
  grouped: GroupedAccounts;
  totalNetWorth: number;
  /** 계좌 중 가장 최근 수정 시각 (서버에서 포맷) */
  lastModifiedLabel: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

const TYPE_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; badge: string; bar: string }
> = {
  입출금: {
    icon: Banknote,
    color: "text-primary",
    bg: "bg-primary/10",
    badge: "bg-primary/10 text-primary",
    bar: "bg-primary",
  },
  금고: {
    icon: Vault,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  저축: {
    icon: PiggyBank,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  증권: {
    icon: TrendingUp,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    badge: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
  연금: {
    icon: ShieldCheck,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    badge: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
};

const DEFAULT_META = {
  icon: Landmark,
  color: "text-muted-foreground",
  bg: "bg-muted",
  badge: "bg-muted text-muted-foreground",
};

function getMeta(type: string) {
  return TYPE_META[type] ?? DEFAULT_META;
}

// ─── Add Account Modal ────────────────────────────────────────────────────────

function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("입출금");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [description, setDescription] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  const bankOptions = getBanksByType(type);

  function handleTypeChange(v: AccountType) {
    setType(v);
    setBankName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(initialBalance.replace(/,/g, ""), 10);
    if (!name.trim() || !bankName.trim() || isNaN(parsed)) return;

    startTransition(async () => {
      await addAccount({
        name,
        type,
        bankName,
        accountNumber,
        description,
        initialBalance: parsed,
      });
      setName("");
      setType("입출금");
      setBankName("");
      setAccountNumber("");
      setDescription("");
      setInitialBalance("");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setType("입출금");
          setBankName("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/90 text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90">
            <Plus className="h-4 w-4" />
            새 자산 추가
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">새 자산 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">분류 *</label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as AccountType)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="분류를 먼저 선택하세요" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">금융기관명 *</label>
            <Select
              value={bankName}
              onValueChange={(v) => v != null && setBankName(v)}
              required
              disabled={bankOptions.length === 0}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={bankOptions.length === 0 ? "분류를 먼저 선택하세요" : "금융기관 선택"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {bankOptions.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    <span className="flex items-center gap-2">
                      <Image
                        src={`/bank_logos/${b.logoFile}`}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 shrink-0 object-contain"
                      />
                      {b.displayName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">계좌명 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">계좌번호</label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">설명</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">초기 잔액 (원) *</label>
            <Input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              required
              min={0}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" className="rounded-xl">
                  취소
                </Button>
              }
            />
            <Button type="submit" size="sm" disabled={pending} className="rounded-xl">
              {pending ? "추가 중…" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Balance Modal ───────────────────────────────────────────────────────

function EditBalanceDialog({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [balance, setBalance] = useState(String(account.initialBalance));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(balance.replace(/,/g, ""), 10);
    if (isNaN(parsed)) return;

    startTransition(async () => {
      await updateAccountBalance(account.id, parsed);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98] transition-transform duration-150"
            aria-label="잔액 수정"
          >
            <Pencil className="h-3 w-3" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">잔액 수정</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          <span className="font-medium text-foreground">{account.name}</span>의 현재 잔액을 수정합니다.
        </p>
        <form onSubmit={handleSubmit} className="mt-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">새 잔액 (원)</label>
            <Input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
              className="rounded-xl text-lg font-semibold"
            />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" className="rounded-xl">
                  취소
                </Button>
              }
            />
            <Button type="submit" size="sm" disabled={pending} className="rounded-xl">
              {pending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Button ────────────────────────────────────────────────────────────

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("이 자산을 삭제하시겠습니까?")) return;
        startTransition(async () => {
          await deleteAccount(id);
        });
      }}
      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] transition-transform duration-150 disabled:opacity-40"
      aria-label="삭제"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account }: { account: Account }) {
  const meta = getMeta(account.type);
  const Icon = meta.icon;
  const logoPath = getBankLogoPath(account.bankName);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-col min-h-[132px] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl">
      {/* 상단: 로고(36px) + 은행명 + 액션 — 컴팩트 */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {logoPath ? (
          <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 overflow-hidden border border-slate-100 dark:border-white/10">
            <Image
              src={logoPath}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          </div>
        ) : (
          <div className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg ${meta.bg}`}>
            <Icon className={`h-4 w-4 ${meta.color}`} />
          </div>
        )}
        <span className="text-xs font-medium text-slate-400 truncate flex-1 min-w-0">
          {account.bankName ?? "—"}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <EditBalanceDialog account={account} />
          <DeleteButton id={account.id} />
        </div>
      </div>

      {/* 계좌명 — 전체 폭 */}
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate mt-2">
        {account.name}
      </p>

      {/* 금액(강조) + 계좌번호 — 하단 고정 */}
      <div className="flex flex-col gap-1 mt-auto pt-2">
        <p className={`text-xl font-black tracking-tighter leading-tight ${meta.color}`}>
          {formatKRW(account.initialBalance)}
        </p>
        {account.accountNumber && (
          <p className="text-[11px] text-slate-400 font-mono tracking-wide truncate">
            {account.accountNumber}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function BoardColumn({
  type,
  accounts,
}: {
  type: string;
  accounts: Account[];
}) {
  const meta = getMeta(type);
  const Icon = meta.icon;
  const columnTotal = accounts.reduce((s, a) => s + a.initialBalance, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2.5 px-1">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${meta.bg} dark:bg-white/5`}>
          <Icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <span className="text-sm font-black tracking-tighter text-slate-800 dark:text-slate-200">{type}</span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 px-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {accounts.length}
        </span>
      </div>

      {/* Column subtotal */}
      <div className={`rounded-2xl px-4 py-3 border border-slate-200 dark:border-white/10 ${meta.bg} dark:bg-[#18181B]`}>
        <p className="text-xs font-medium text-slate-500">소계</p>
        <p className={`text-base font-black tracking-tighter ${meta.color}`}>{formatKRW(columnTotal)}</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-6 text-center">
            <p className="text-xs text-slate-400 font-medium">자산 없음</p>
          </div>
        ) : (
          accounts.map((acc) => <AccountCard key={acc.id} account={acc} />)
        )}
      </div>
    </div>
  );
}

// ─── Asset Breakdown Chart ───────────────────────────────────────────────────

const SEGMENT_COLORS = {
  입출금: {
    bar: "bg-primary",
    barGradient: "from-primary via-primary/95 to-primary/80",
    dot: "bg-primary",
    glow: "shadow-primary/30",
  },
  금고: {
    bar: "bg-amber-500",
    barGradient: "from-amber-500 via-amber-400 to-amber-500/90",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/25",
  },
  저축: {
    bar: "bg-emerald-500",
    barGradient: "from-emerald-500 via-emerald-400 to-emerald-500/90",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/25",
  },
  증권: {
    bar: "bg-violet-500",
    barGradient: "from-violet-500 via-violet-400 to-violet-500/90",
    dot: "bg-violet-500",
    glow: "shadow-violet-500/25",
  },
  연금: {
    bar: "bg-sky-500",
    barGradient: "from-sky-500 via-sky-400 to-sky-500/90",
    dot: "bg-sky-500",
    glow: "shadow-sky-500/25",
  },
};

function AssetBreakdownChart({
  grouped,
  totalNetWorth,
}: {
  grouped: GroupedAccounts;
  totalNetWorth: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleEnter = (type: string) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredType(type);
  };

  const handleLeave = (e: React.MouseEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next instanceof Node && chartRef.current?.contains(next)) return;
    leaveTimeoutRef.current = setTimeout(() => setHoveredType(null), 250);
  };

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const segments = ACCOUNT_TYPES.map((type) => {
    const accounts = grouped[type] ?? [];
    const amount = accounts.reduce((s, a) => s + a.initialBalance, 0);
    const percent = totalNetWorth > 0 ? (amount / totalNetWorth) * 100 : 0;
    return { type, amount, percent };
  }).filter((s) => s.amount > 0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => {
      clearTimeout(t);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  if (totalNetWorth === 0) {
    return (
      <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary/60 to-primary" />
          <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            자산 구성 비중
          </h3>
        </div>
        <div className="h-10 rounded-2xl bg-slate-50 dark:bg-white/5 overflow-hidden border border-dashed border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-400 py-6 text-center font-medium">
            자산을 추가하면 분류별 비중이 막대 그래프로 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary/60 to-primary shadow-sm shadow-primary/20" />
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              자산 구성 비중
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              분류별 합계 비율
            </p>
          </div>
        </div>
        <span className="text-sm font-black tracking-tighter text-slate-600 dark:text-slate-400 tabular-nums">
          총 {formatKRW(totalNetWorth)}
        </span>
      </div>

      {/* Bar + Legend - hover sync, only wrapper handles leave */}
      <div ref={chartRef} className="relative" onMouseLeave={handleLeave}>
        <div className="relative h-8 md:h-10 w-full rounded-xl overflow-hidden bg-muted/30 border border-border/50 shadow-inner">
          <div className="flex h-full w-full">
            {segments.map((seg, i) => {
              const colors = SEGMENT_COLORS[seg.type] ?? {
                bar: "bg-muted-foreground/40",
                barGradient: "from-muted-foreground/50 to-muted-foreground/30",
                dot: "bg-muted-foreground",
                glow: "",
              };
              const isHovered = hoveredType === seg.type;
              const width = mounted ? seg.percent : 0;
              const meta = getMeta(seg.type);
              const Icon = meta.icon;
              return (
                <div
                  key={seg.type}
                  className={`relative h-full transition-all duration-700 ease-out first:rounded-l-xl last:rounded-r-xl overflow-hidden group/seg ${
                    isHovered ? "z-10 brightness-110" : "hover:brightness-110"
                  }`}
                  style={{
                    width: `${width}%`,
                    minWidth: seg.percent > 0 ? 4 : 0,
                    transitionDelay: `${i * 100}ms`,
                  }}
                  onMouseEnter={() => handleEnter(seg.type)}
                  title={`${seg.type}: ${formatKRW(seg.amount)} (${seg.percent.toFixed(1)}%)`}
                >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${colors.barGradient} ${
                    isHovered ? `shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]` : ""
                  }`}
                />
                <div className="absolute inset-0 bg-white/0 group-hover/seg:bg-white/10 transition-colors duration-200" />
                {seg.percent >= 6 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-white/90 drop-shadow-md opacity-80 group-hover/seg:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {/* Legend - 일정한 간격으로 칸 전체에 정렬, 공간 부족 시 줄바꿈 (스크롤바 없음) */}
        <div className="flex flex-wrap gap-x-4 gap-y-3 md:gap-0 md:justify-between mt-5 md:pb-1 w-full min-w-0 overflow-hidden">
        {segments.map((seg) => {
          const colors = SEGMENT_COLORS[seg.type] ?? {
            bar: "bg-muted",
            dot: "bg-muted-foreground",
            glow: "",
          };
          const meta = getMeta(seg.type);
          const Icon = meta.icon;
          const isHovered = hoveredType === seg.type;
          return (
            <button
              key={seg.type}
              type="button"
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 -mx-1 transition-all duration-200 text-left shrink-0 whitespace-nowrap ${
                isHovered ? "bg-muted/80 ring-1 ring-border" : "hover:bg-muted/50"
              }`}
              onMouseEnter={() => handleEnter(seg.type)}
              title={`${seg.type}: ${formatKRW(seg.amount)} (${seg.percent.toFixed(1)}%)`}
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${colors.dot} ${
                  isHovered ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110" : ""
                }`}
              />
              <Icon className={`h-3 w-3 shrink-0 ${meta.color}`} />
              <span className="font-medium text-foreground text-sm">{seg.type}</span>
              <span className={`font-bold tabular-nums ${meta.color}`}>
                {seg.percent.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AssetBoardClient({
  grouped,
  totalNetWorth,
  lastModifiedLabel,
}: Props) {
  const allTypes = Array.from(ACCOUNT_TYPES);
  const totalAccounts = allTypes.reduce((sum, t) => sum + (grouped[t]?.length ?? 0), 0);

  return (
    <div className="px-4 py-6 md:p-8 lg:p-10 space-y-8 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="hidden md:flex text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 items-center gap-2.5 min-w-0">
            <Landmark className="h-8 w-8 text-primary shrink-0" />
            <span className="break-words">자산 현황</span>
          </h1>
          <p className="hidden md:block text-sm text-slate-400 font-medium">계좌 및 투자 자산 현황 관리</p>
          {lastModifiedLabel && (
            <p className="hidden md:block text-[11px] text-slate-400/80 mt-1.5 tabular-nums">
              마지막 수정 · {lastModifiedLabel}
            </p>
          )}
        </div>
      </div>

      {/* TOTAL NET WORTH + 새 자산 추가 */}
      <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6 md:gap-8 min-w-0 md:pl-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Total Net Worth
            </p>
            <p className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 tabular-nums">
              {formatKRW(totalNetWorth).replace(/^₩/, "₩  ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge className="rounded-full bg-primary/10 text-primary border-0 px-4 py-1.5 text-xs font-bold">
            {totalAccounts}개 계좌
          </Badge>
          <AddAccountDialog />
        </div>
      </div>

      {/* Asset Breakdown Bar Chart */}
      <AssetBreakdownChart grouped={grouped} totalNetWorth={totalNetWorth} />

      {/* Board View */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
        {allTypes.map((type) => (
          <BoardColumn
            key={type}
            type={type}
            accounts={grouped[type] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
