"use client";

import { useState, useTransition } from "react";
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
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { useIsDesktopMd } from "@/hooks/use-is-desktop-md";
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
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";
import { addAccount, updateAccount, deleteAccount } from "@/app/actions/asset";
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
}

interface GroupedAccounts {
  [type: string]: Account[];
}

interface Props {
  grouped: GroupedAccounts;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 분류별 아이콘 — 색 구분 없음(모두 fg-tertiary). 분류 구분은 제목 텍스트가 한다 */
const TYPE_ICONS: Record<string, React.ElementType> = {
  입출금: Banknote,
  금고: Vault,
  저축: PiggyBank,
  증권: TrendingUp,
  연금: ShieldCheck,
};

function getTypeIcon(type: string): React.ElementType {
  return TYPE_ICONS[type] ?? Landmark;
}

// ─── Account Form Modal (추가 / 수정 공용) ────────────────────────────────────

function AccountFormDialog({
  account,
  trigger,
}: {
  /** 있으면 수정, 없으면 추가 */
  account?: Account;
  trigger: React.ReactElement;
}) {
  const isEdit = !!account;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isDesktop = useIsDesktopMd();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>((account?.type as AccountType) ?? "입출금");
  const [bankName, setBankName] = useState(account?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [description, setDescription] = useState(account?.description ?? "");

  const bankOptions = getBanksByType(type);

  function resetToInitial() {
    setName(account?.name ?? "");
    setType((account?.type as AccountType) ?? "입출금");
    setBankName(account?.bankName ?? "");
    setAccountNumber(account?.accountNumber ?? "");
    setDescription(account?.description ?? "");
  }

  function handleTypeChange(v: AccountType) {
    setType(v);
    setBankName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !bankName.trim()) return;

    startTransition(async () => {
      const data = { name, type, bankName, accountNumber, description };
      if (account) {
        await updateAccount(account.id, data);
      } else {
        await addAccount(data);
        resetToInitial();
      }
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetToInitial();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md rounded-card">
        <DialogHeader>
          <DialogTitle className="t5 font-bold text-foreground">
            {isEdit ? "계좌 수정" : "새 계좌 추가"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary">분류 *</label>
            <ResponsiveSelect
              value={type}
              onValueChange={(v) => handleTypeChange(v as AccountType)}
              options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="분류를 먼저 선택하세요"
              triggerClassName="rounded-control"
              contentClassName="rounded-control"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary">금융기관명 *</label>
            {isDesktop ? (
              <Select
                value={bankName}
                onValueChange={(v) => v != null && setBankName(v)}
                required
                disabled={bankOptions.length === 0}
              >
                <SelectTrigger className="rounded-control">
                  <SelectValue placeholder={bankOptions.length === 0 ? "분류를 먼저 선택하세요" : "금융기관 선택"} />
                </SelectTrigger>
                <SelectContent className="rounded-control">
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
            ) : (
              <div className="relative w-full">
                <select
                  required
                  disabled={bankOptions.length === 0}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="flex h-11 w-full appearance-none rounded-control border border-input bg-transparent py-2 pl-3 pr-10 text-base outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
                  aria-label="금융기관 선택"
                >
                  <option value="" disabled>
                    {bankOptions.length === 0 ? "분류를 먼저 선택하세요" : "금융기관 선택"}
                  </option>
                  {bankOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
                  aria-hidden
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary">계좌명 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-control"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary">계좌번호</label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="rounded-control"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary">설명</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-control"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" className="rounded-control border-0 bg-divider text-foreground hover:bg-divider">
                  취소
                </Button>
              }
            />
            <Button type="submit" size="sm" disabled={pending} className="rounded-control bg-primary text-primary-foreground">
              {pending ? (isEdit ? "저장 중…" : "추가 중…") : isEdit ? "저장" : "추가"}
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
        if (!confirm("이 계좌를 삭제하시겠습니까?")) return;
        startTransition(async () => {
          await deleteAccount(id);
        });
      }}
      className="flex h-8 w-8 items-center justify-center rounded-pill text-fg-tertiary hover:bg-divider hover:text-negative active:scale-[0.97] transition-transform duration-150 disabled:opacity-40 touch-manipulation"
      aria-label="삭제"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

/** 계좌번호 복사 버튼: 숫자만 복사, 잠깐 "복사됨" 표시 */
function CopyAccountNumberButton({ accountNumber }: { accountNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(accountNumber.replace(/\D/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 접근이 막힌 환경에서는 무시 */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="t8 inline-flex shrink-0 items-center gap-1 rounded-pill bg-divider px-2 py-0.5 font-medium text-fg-secondary hover:bg-accent-soft hover:text-primary transition-colors touch-manipulation"
      aria-label="계좌번호 복사"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

function AccountCard({ account }: { account: Account }) {
  const Icon = getTypeIcon(account.type);
  const logoPath = getBankLogoPath(account.bankName);

  return (
    <div className="rounded-card bg-card p-4 flex flex-col gap-1">
      {/* 1줄: 로고 + 계좌 별칭 + 수정·삭제 */}
      <div className="flex items-center gap-3 min-w-0">
        {logoPath ? (
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-control bg-background overflow-hidden">
            <Image
              src={logoPath}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>
        ) : (
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-control bg-background">
            <Icon className="h-5 w-5 text-fg-tertiary" />
          </div>
        )}
        <p className="t6 flex-1 min-w-0 font-bold text-foreground break-words">
          {account.name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <AccountFormDialog
            account={account}
            trigger={
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-pill text-fg-tertiary hover:bg-accent-soft hover:text-primary active:scale-[0.97] transition-transform duration-150 touch-manipulation"
                aria-label="계좌 수정"
              >
                <Pencil className="h-4 w-4" />
              </button>
            }
          />
          <DeleteButton id={account.id} />
        </div>
      </div>

      {/* 2줄: 은행명 */}
      {account.bankName && (
        <p className="t7 text-fg-tertiary break-words">{account.bankName}</p>
      )}

      {/* 3줄: 계좌번호 + 복사 */}
      {account.accountNumber && (
        <div className="flex items-center gap-2 min-w-0">
          <p className="t7 numeric text-fg-tertiary break-all">
            {account.accountNumber}
          </p>
          <CopyAccountNumberButton accountNumber={account.accountNumber} />
        </div>
      )}

      {/* 4줄: 용도 설명 */}
      {account.description && (
        <p className="t7 text-fg-tertiary break-words">{account.description}</p>
      )}
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
  const Icon = getTypeIcon(type);

  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-5 w-5 shrink-0 text-fg-tertiary" />
        <span className="t5 font-bold text-foreground">{type}</span>
        <span className="t7 numeric text-fg-tertiary">
          {accounts.length}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 items-start">
        {accounts.length === 0 ? (
          <div className="col-span-full rounded-card bg-card px-4 py-6 text-center">
            <p className="t7 text-fg-tertiary">등록된 계좌가 없습니다</p>
          </div>
        ) : (
          accounts.map((acc) => <AccountCard key={acc.id} account={acc} />)
        )}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AssetBoardClient({ grouped }: Props) {
  const allTypes = Array.from(ACCOUNT_TYPES);
  const totalAccounts = allTypes.reduce((sum, t) => sum + (grouped[t]?.length ?? 0), 0);

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t3 hidden md:flex font-bold text-foreground mb-1 items-center gap-2 min-w-0">
            <Landmark className="h-6 w-6 text-primary shrink-0" />
            <span className="break-words">계좌 목록</span>
          </h1>
          <p className="t7 hidden md:block text-fg-tertiary">계좌 정보 관리</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge className="t7 numeric h-auto rounded-pill bg-accent-soft text-primary border-0 px-3 py-2 font-semibold">
            {totalAccounts}개 계좌
          </Badge>
          <AccountFormDialog
            trigger={
              <Button size="sm" className="t7 gap-1 rounded-control bg-primary font-bold text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" />
                새 계좌 추가
              </Button>
            }
          />
        </div>
      </div>

      {/* Board View */}
      <div className="flex flex-col gap-7">
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
