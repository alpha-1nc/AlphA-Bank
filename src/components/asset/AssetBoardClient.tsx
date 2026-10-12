"use client";

import { useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Landmark,
  Banknote,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  Vault,
  Copy,
  ChevronLeft,
} from "lucide-react";
import {
  Badge,
  BottomSheet,
  Button,
  IconButton,
  ListRow,
  SegmentedControl,
  TextField,
  Top,
  useDialog,
  useToast,
} from "@/components/ui";
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
  목적자금: Vault,
  저축: PiggyBank,
  증권: TrendingUp,
  연금: ShieldCheck,
};

function getTypeIcon(type: string): React.ElementType {
  return TYPE_ICONS[type] ?? Landmark;
}

// ─── Account Form Sheet (추가 / 수정 공용) ────────────────────────────────────

function AccountFormSheet({
  account,
  open,
  onClose,
}: {
  /** 있으면 수정, 없으면 추가 */
  account?: Account;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = !!account;
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>((account?.type as AccountType) ?? "입출금");
  const [bankName, setBankName] = useState(account?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [description, setDescription] = useState(account?.description ?? "");

  const bankOptions = getBanksByType(type);
  const [step, setStep] = useState<"form" | "bank">("form");

  function resetToInitial() {
    setStep("form");
    setName(account?.name ?? "");
    setType((account?.type as AccountType) ?? "입출금");
    setBankName(account?.bankName ?? "");
    setAccountNumber(account?.accountNumber ?? "");
    setDescription(account?.description ?? "");
  }

  function handleClose() {
    onClose();
    resetToInitial();
  }

  function handleTypeChange(v: string) {
    setType(v as AccountType);
    setBankName("");
  }

  function handleSubmit() {
    if (!name.trim() || !bankName.trim()) return;

    startTransition(async () => {
      const data = { name, type, bankName, accountNumber, description };
      if (account) {
        await updateAccount(account.id, data);
      } else {
        await addAccount(data);
        resetToInitial();
      }
      onClose();
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      hasTextField
      header={
        step === "bank" ? (
          <div className="flex items-center gap-1">
            <IconButton aria-label="뒤로가기" icon={ChevronLeft} variant="clear" iconSize={24} onClick={() => setStep("form")} />
            <BottomSheet.Header>은행 선택</BottomSheet.Header>
          </div>
        ) : (
          <BottomSheet.Header>{isEdit ? "계좌 수정" : "계좌 추가"}</BottomSheet.Header>
        )
      }
      cta={
        step === "form" ? (
          <BottomSheet.CTA loading={pending} disabled={!name.trim() || !bankName.trim()} onClick={handleSubmit}>
            저장
          </BottomSheet.CTA>
        ) : undefined
      }
    >
      {step === "bank" ? (
        <div className="-mx-6 flex flex-col">
          {bankOptions.map((b) => (
            <ListRow
              key={b.value}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              left={<ListRow.AssetIcon src={`/bank_logos/${b.logoFile}`} shape="squircle" size="small" />}
              contents={<ListRow.Texts type="1RowTypeA" top={b.displayName} />}
              onClick={() => {
                setBankName(b.value);
                setStep("form");
              }}
            />
          ))}
        </div>
      ) : (
      <div className="flex flex-col gap-4 pb-1 pt-2">
        <SegmentedControl size="large" alignment="fixed" value={type} onChange={handleTypeChange} aria-label="분류">
          {ACCOUNT_TYPES.map((t) => (
            <SegmentedControl.Item key={t} value={t}>
              {t}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
        <TextField variant="box" label="계좌명" labelOption="sustain" value={name} onChange={(e) => setName(e.target.value)} />
        <ListRow
          withTouchEffect
          withArrow
          border="none"
          horizontalPadding="small"
          className="rounded-control bg-divider"
          onClick={() => setStep("bank")}
          contents={<span className="t5 font-medium text-fg-tertiary">은행명</span>}
          right={
            bankName ? (
              <span className="t5 font-medium text-foreground">{bankName}</span>
            ) : (
              <span className="t5 font-medium" style={{ color: "var(--tk-tertiary-fg)" }}>
                선택
              </span>
            )
          }
        />
        <TextField
          variant="box"
          label="계좌번호"
          labelOption="sustain"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
        />
        <TextField
          variant="box"
          label="용도 설명"
          labelOption="sustain"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      )}
    </BottomSheet>
  );
}

// ─── Account Row ──────────────────────────────────────────────────────────────

function AccountRow({ account, last }: { account: Account; last: boolean }) {
  const Icon = getTypeIcon(account.type);
  const logoPath = getBankLogoPath(account.bankName);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const { openToast } = useToast();
  const { openConfirm } = useDialog();

  const bankLine = [account.bankName, account.accountNumber].filter(Boolean).join(" · ");

  async function handleCopy() {
    if (!account.accountNumber) return;
    try {
      await navigator.clipboard.writeText(account.accountNumber.replace(/\D/g, ""));
      openToast("계좌번호를 복사했어요", { type: "bottom" });
    } catch {
      /* 클립보드 접근이 막힌 환경에서는 무시 */
    }
  }

  async function handleDelete() {
    const ok = await openConfirm({ title: "이 계좌를 삭제하시겠습니까?", confirmButton: "삭제", cancelButton: "취소" });
    if (!ok) return;
    startTransition(async () => {
      await deleteAccount(account.id);
    });
  }

  return (
    <>
      <ListRow
        border={last ? "none" : "indented"}
        verticalPadding="medium"
        left={
          logoPath ? (
            <ListRow.AssetIcon src={logoPath} shape="squircle" size="medium" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-divider">
              <Icon className="h-5 w-5 text-fg-tertiary" aria-hidden />
            </span>
          )
        }
        contents={
          account.description ? (
            <ListRow.Texts type="3RowTypeA" top={account.description} middle={account.name} bottom={bankLine} />
          ) : (
            <ListRow.Texts type="2RowTypeA" top={account.name} bottom={bankLine} />
          )
        }
        right={
          <>
            {account.accountNumber && (
              <IconButton aria-label="계좌번호 복사" icon={Copy} variant="clear" iconSize={20} onClick={handleCopy} />
            )}
            <IconButton aria-label="계좌 수정" icon={Pencil} variant="clear" iconSize={20} onClick={() => setEditing(true)} />
            <IconButton
              aria-label="삭제"
              icon={Trash2}
              variant="clear"
              iconSize={20}
              disabled={pending}
              onClick={handleDelete}
            />
          </>
        }
      />
      <AccountFormSheet account={account} open={editing} onClose={() => setEditing(false)} />
    </>
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

      {accounts.length === 0 ? (
        <div className="rounded-card bg-card px-4 py-6 text-center">
          <p className="t7 text-fg-tertiary">등록된 계좌가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card bg-card">
          {accounts.map((acc, i) => (
            <AccountRow key={acc.id} account={acc} last={i === accounts.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AssetBoardClient({ grouped }: Props) {
  const allTypes = Array.from(ACCOUNT_TYPES);
  const totalAccounts = allTypes.reduce((sum, t) => sum + (grouped[t]?.length ?? 0), 0);
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex justify-end md:hidden">
        <Button size="medium" color="primary" variant="fill" onClick={() => setAdding(true)}>
          새 계좌 추가
        </Button>
      </div>
      <Top
        className="hidden px-0 md:block"
        upperGap={0}
        lowerGap={0}
        title={
          <div className="flex min-w-0 items-center gap-2">
            <Top.TitleParagraph size={22}>계좌 목록</Top.TitleParagraph>
            <Badge color="grey" variant="weak" size="small">
              {totalAccounts}개 계좌
            </Badge>
          </div>
        }
        subtitleBottom={<Top.SubtitleParagraph size={15}>계좌 정보 관리</Top.SubtitleParagraph>}
        right={<Top.RightButton onClick={() => setAdding(true)}>새 계좌 추가</Top.RightButton>}
      />
      <AccountFormSheet open={adding} onClose={() => setAdding(false)} />

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
