"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, Database, ShieldAlert } from "lucide-react";
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  ListRow,
  TextField,
  Top,
  useDialog,
  useToast,
} from "@/components/ui";
import {
  updateBudgetStartDate,
  exportAllDataCSV,
  factoryReset,
} from "@/app/actions/settings";
import type { Workplace } from "@/generated/prisma";
import WorkplaceSettingsCard from "@/components/settings/WorkplaceSettingsCard";
import NotificationSettingsCard, { type NotificationSettingsValues } from "@/components/settings/NotificationSettingsCard";
import SettingsSection, { SettingsIconBox } from "@/components/settings/SettingsSection";

const CONFIRM_TEXT = "AlphA Inc.";

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface SettingsClientProps {
  initialBudgetStartDate: number;
  initialNotificationSettings: NotificationSettingsValues;
  initialWorkplaces: Workplace[];
}

export default function SettingsClient({
  initialBudgetStartDate,
  initialNotificationSettings,
  initialWorkplaces,
}: SettingsClientProps) {
  const [budgetStartDate, setBudgetStartDate] = useState(initialBudgetStartDate);
  const [dayOpen, setDayOpen] = useState(false);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [, startTransition] = useTransition();
  const { openToast } = useToast();
  const { openConfirm } = useDialog();

  async function handleBudgetStartChange(value: string) {
    const day = parseInt(value, 10);
    if (day >= 1 && day <= 31) {
      setBudgetStartDate(day);
      startTransition(async () => {
        await updateBudgetStartDate(day);
        openToast("저장했어요", { type: "bottom" });
      });
    }
  }

  async function handleExportCSV() {
    setIsExporting(true);
    try {
      const { accountCSV, cashFlowCSV, bucketListCSV } = await exportAllDataCSV();
      const timestamp = new Date().toISOString().slice(0, 10);
      const combined =
        `# Accounts\n${accountCSV}\n\n# CashFlows\n${cashFlowCSV}\n\n# BucketList\n${bucketListCSV}`;
      downloadCSV(combined, `alphabank-export-${timestamp}.csv`);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFactoryReset() {
    if (confirmInput !== CONFIRM_TEXT) return;
    const ok = await openConfirm({
      title: "모든 데이터를 초기화하시겠습니까?",
      description: "되돌릴 수 없어요.",
      confirmButton: (
        <ConfirmDialog.ConfirmButton color="light" variant="fill" style={{ color: "var(--tk-negative)" }}>
          초기화
        </ConfirmDialog.ConfirmButton>
      ),
      cancelButton: "취소",
    });
    if (!ok) return;
    setIsResetting(true);
    try {
      await factoryReset(confirmInput);
      setFactoryResetOpen(false);
      setConfirmInput("");
      window.location.href = "/";
    } catch {
      // Invalid confirmation
    } finally {
      setIsResetting(false);
    }
  }

  const isConfirmValid = confirmInput === CONFIRM_TEXT;

  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}일`,
  }));

  const periodPreview = (() => {
    if (budgetStartDate === 1) return "당월 1일 ~ 당월 말일";
    return `당월 ${budgetStartDate}일 ~ 익월 ${budgetStartDate - 1}일`;
  })();

  return (
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[960px] mx-auto min-w-0 overflow-x-hidden">
      <Top
        className="hidden px-0 md:block"
        upperGap={0}
        lowerGap={0}
        title={<Top.TitleParagraph size={22}>시스템 설정</Top.TitleParagraph>}
        subtitleBottom={<Top.SubtitleParagraph size={15}>재무 파라미터 및 인프라 통제 패널</Top.SubtitleParagraph>}
      />

      {/* 예산 기준일 */}
      <SettingsSection
        title="예산 기준일"
        note="1일이면 당월 1일~말일, 25일이면 당월 25일~익월 24일로 예산 통제 기간이 설정됩니다. 변경 즉시 /budget 페이지의 기간 표시에 반영됩니다."
      >
        <ListRow
          withTouchEffect
          withArrow
          border="none"
          verticalPadding="medium"
          onClick={() => setDayOpen(true)}
          left={
            <SettingsIconBox>
              <CalendarDays className="h-5 w-5 text-fg-tertiary" aria-hidden />
            </SettingsIconBox>
          }
          contents={<ListRow.Texts type="2RowTypeA" top="월간 예산 기준일" bottom={periodPreview} />}
          right={<span className="t5 numeric font-medium text-fg-secondary">{budgetStartDate}일</span>}
        />
      </SettingsSection>

      <NotificationSettingsCard
        initialSettings={initialNotificationSettings}
        hasActiveWorkplace={initialWorkplaces.some((w) => w.isActive)}
      />

      {/* 데이터 관리 */}
      <SettingsSection title="데이터 관리">
        <ListRow
          border="indented"
          verticalPadding="medium"
          left={
            <SettingsIconBox>
              <Database className="h-5 w-5 text-fg-tertiary" aria-hidden />
            </SettingsIconBox>
          }
          contents={
            <ListRow.Texts type="2RowTypeA" top="CSV 데이터 추출" bottom="계좌, 현금흐름, 버킷리스트 전체를 내려받아요" />
          }
          right={
            <Button
              size="small"
              color="light"
              variant="weak"
              display="block"
              loading={isExporting}
              disabled={isExporting}
              onClick={handleExportCSV}
            >
              추출
            </Button>
          }
        />
        <ListRow
          border="none"
          verticalPadding="medium"
          left={
            <SettingsIconBox>
              <ShieldAlert className="h-5 w-5" style={{ color: "var(--tk-negative)" }} aria-hidden />
            </SettingsIconBox>
          }
          contents={
            <ListRow.Texts type="2RowTypeA" top="시스템 초기화" bottom="모든 데이터가 영구 삭제되며 되돌릴 수 없어요" />
          }
          right={
            <Button
              size="small"
              color="light"
              variant="weak"
              display="block"
              style={{ color: "var(--tk-negative)" }}
              onClick={() => setFactoryResetOpen(true)}
            >
              초기화
            </Button>
          }
        />
      </SettingsSection>

      <WorkplaceSettingsCard initialWorkplaces={initialWorkplaces} />

      <footer className="pt-7 pb-4 text-center space-y-1">
        <p className="st12 numeric text-fg-disabled">v1.0.0</p>
        <p className="st12 text-fg-disabled">© 2026 AlphA Bank. All rights reserved.</p>
        <p className="st12 text-fg-disabled">A subsidiary of AlphA Inc.</p>
      </footer>

      {/* 예산 기준일 선택 시트 */}
      <BottomSheet open={dayOpen} onClose={() => setDayOpen(false)} header={<BottomSheet.Header>예산 기준일</BottomSheet.Header>}>
        <div className="-mx-6 flex flex-col">
          {dayOptions.map((o) => (
            <ListRow
              key={o.value}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={o.label} />}
              right={Number(o.value) === budgetStartDate ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => {
                setDayOpen(false);
                handleBudgetStartChange(o.value);
              }}
            />
          ))}
        </div>
      </BottomSheet>

      {/* 시스템 초기화 시트 */}
      <BottomSheet
        open={factoryResetOpen}
        onClose={() => {
          setFactoryResetOpen(false);
          setConfirmInput("");
        }}
        hasTextField
        header={<BottomSheet.Header>시스템 초기화 확인</BottomSheet.Header>}
        headerDescription={`모든 데이터가 영구 삭제됩니다. 계속하려면 아래 입력란에 ${CONFIRM_TEXT} 를 정확히 입력하세요.`}
        cta={
          <BottomSheet.CTA
            color="light"
            variant="fill"
            style={{ color: "var(--tk-negative)" }}
            loading={isResetting}
            disabled={!isConfirmValid}
            onClick={handleFactoryReset}
          >
            초기화 실행
          </BottomSheet.CTA>
        }
      >
        <div className="flex flex-col gap-4 pb-1 pt-2">
          <TextField
            variant="box"
            label="확인 문구 입력"
            labelOption="sustain"
            placeholder={CONFIRM_TEXT}
            autoComplete="off"
            value={confirmInput}
            hasError={confirmInput.length > 0 && !isConfirmValid}
            help={
              confirmInput.length > 0 && !isConfirmValid
                ? "입력한 텍스트가 일치하지 않습니다"
                : isConfirmValid
                  ? "확인 완료 — 초기화 버튼이 활성화되었습니다"
                  : undefined
            }
            onChange={(e) => setConfirmInput(e.target.value)}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
