"use client";

import { useEffect, useState, useTransition } from "react";
import { Reorder, useDragControls } from "motion/react";
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
  GripVertical,
} from "lucide-react";
import {
  Badge,
  BottomSheet,
  Button,
  IconButton,
  ListRow,
  SegmentedControl,
  TextButton,
  TextField,
  Top,
  useDialog,
  useToast,
} from "@/components/ui";
import { addAccount, updateAccount, deleteAccount, reorderAccounts } from "@/app/actions/asset";
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

function accountLeft(account: Account) {
  const Icon = getTypeIcon(account.type);
  const logoPath = getBankLogoPath(account.bankName);
  return logoPath ? (
    <ListRow.AssetIcon src={logoPath} shape="squircle" size="medium" />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-divider">
      <Icon className="h-5 w-5 text-fg-tertiary" aria-hidden />
    </span>
  );
}

function accountContents(account: Account) {
  const bankLine = [account.bankName, account.accountNumber].filter(Boolean).join(" · ");
  return account.description ? (
    <ListRow.Texts type="3RowTypeA" top={account.description} middle={account.name} bottom={bankLine} />
  ) : (
    <ListRow.Texts type="2RowTypeA" top={account.name} bottom={bankLine} />
  );
}

/** 편집 모드 행 — 핸들을 잡았을 때만 드래그, 핸들에서 ↑/↓ 키로도 이동 */
function ReorderableAccountRow({
  account,
  last,
  onMove,
}: {
  account: Account;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={account}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02 }}
      className="relative bg-card"
    >
      <ListRow
        border={last ? "none" : "indented"}
        verticalPadding="medium"
        left={accountLeft(account)}
        contents={accountContents(account)}
        right={
          <button
            type="button"
            aria-label="순서 변경 핸들"
            aria-description={`${account.name} 순서 변경. 위/아래 방향키로도 이동할 수 있어요`}
            className="flex h-9 w-9 cursor-grab items-center justify-center text-fg-tertiary active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => controls.start(e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                onMove(-1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                onMove(1);
              }
            }}
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
        }
      />
    </Reorder.Item>
  );
}

function AccountRow({ account, last }: { account: Account; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const { openToast } = useToast();
  const { openConfirm } = useDialog();

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
        left={accountLeft(account)}
        contents={accountContents(account)}
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
  editing,
  onReorder,
}: {
  type: string;
  accounts: Account[];
  editing: boolean;
  onReorder: (type: string, next: Account[]) => void;
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
      ) : editing ? (
        <Reorder.Group
          as="div"
          axis="y"
          values={accounts}
          onReorder={(next) => onReorder(type, next)}
          className="rounded-card bg-card"
        >
          {accounts.map((acc, i) => (
            <ReorderableAccountRow
              key={acc.id}
              account={acc}
              last={i === accounts.length - 1}
              onMove={(dir) => {
                const to = i + dir;
                if (to < 0 || to >= accounts.length) return;
                const next = [...accounts];
                [next[i], next[to]] = [next[to], next[i]];
                onReorder(type, next);
              }}
            />
          ))}
        </Reorder.Group>
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
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const { openToast } = useToast();
  /** 편집 중(또는 저장 직후 서버 갱신 전)에 보여줄 작업용 순서 */
  const [draft, setDraft] = useState<GroupedAccounts | null>(null);

  // 서버에서 새 목록이 내려오면 작업용 순서를 버리고 서버 값을 쓴다
  useEffect(() => {
    if (!editing) setDraft(null);
  }, [grouped, editing]);

  const view = draft ?? grouped;

  function startEditing() {
    setDraft(Object.fromEntries(allTypes.map((t) => [t, [...(grouped[t] ?? [])]])));
    setEditing(true);
  }

  function handleReorder(type: string, next: Account[]) {
    setDraft((prev) => (prev ? { ...prev, [type]: next } : prev));
  }

  function finishEditing() {
    if (!draft) {
      setEditing(false);
      return;
    }
    const changed = allTypes.filter((t) => {
      const before = (grouped[t] ?? []).map((a) => a.id).join(",");
      const after = (draft[t] ?? []).map((a) => a.id).join(",");
      return before !== after;
    });
    if (changed.length === 0) {
      setEditing(false);
      return;
    }
    startSaving(async () => {
      try {
        const results = await Promise.all(changed.map((t) => reorderAccounts(draft[t].map((a) => a.id))));
        if (results.some((ok) => !ok)) throw new Error("reorder rejected");
        openToast("순서를 저장했어요", { type: "bottom" });
        setEditing(false);
      } catch {
        openToast("순서를 저장하지 못했어요. 다시 시도해 주세요", { type: "bottom" });
      }
    });
  }

  const editButton = (
    <TextButton
      size="small"
      variant="clear"
      className="text-primary"
      disabled={saving}
      onClick={editing ? finishEditing : startEditing}
    >
      {editing ? (saving ? "저장 중…" : "완료") : "순서 편집"}
    </TextButton>
  );

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-end gap-3 md:hidden">
        {editButton}
        <Button size="medium" color="primary" variant="fill" disabled={editing} onClick={() => setAdding(true)}>
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
        right={
          <div className="flex items-center gap-3">
            {editButton}
            <Top.RightButton disabled={editing} onClick={() => setAdding(true)}>
              새 계좌 추가
            </Top.RightButton>
          </div>
        }
      />
      <AccountFormSheet open={adding} onClose={() => setAdding(false)} />

      {editing && (
        <p className="t7 text-fg-tertiary">
          같은 종류 안에서만 순서를 바꿀 수 있어요. 종류를 바꾸려면 계좌 수정에서 변경해 주세요.
        </p>
      )}

      {/* Board View */}
      <div className="flex flex-col gap-7">
        {allTypes.map((type) => (
          <BoardColumn
            key={type}
            type={type}
            accounts={view[type] ?? []}
            editing={editing}
            onReorder={handleReorder}
          />
        ))}
      </div>
    </div>
  );
}
