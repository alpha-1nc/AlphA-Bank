"use client";

import { useState, useTransition } from "react";
import {
  Settings,
  Download,
  AlertTriangle,
  CalendarDays,
  Database,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  ChevronRight,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateBudgetStartDate,
  exportAllDataCSV,
  factoryReset,
} from "@/app/actions/settings";
import type { Workplace } from "@/generated/prisma";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import WorkplaceSettingsCard from "@/components/settings/WorkplaceSettingsCard";

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
  initialWorkplaces: Workplace[];
  currentUserId: string;
  currentProfileName: string;
  currentProfileInitial: string;
}

export default function SettingsClient({
  initialBudgetStartDate,
  initialWorkplaces,
  currentUserId,
  currentProfileName,
  currentProfileInitial,
}: SettingsClientProps) {
  const [budgetStartDate, setBudgetStartDate] = useState(initialBudgetStartDate);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [, startTransition] = useTransition();

  async function handleBudgetStartChange(value: string) {
    const day = parseInt(value, 10);
    if (day >= 1 && day <= 31) {
      setBudgetStartDate(day);
      startTransition(async () => {
        await updateBudgetStartDate(day);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
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

  async function handleSwitchProfile() {
    if (isSwitchingProfile) return;
    setIsSwitchingProfile(true);
    try {
      const res = await fetch("/api/session/destroy", { method: "POST" });
      if (!res.ok) {
        setIsSwitchingProfile(false);
        return;
      }
      window.location.href = "/select-profile";
    } catch {
      setIsSwitchingProfile(false);
    }
  }

  async function handleFactoryReset() {
    if (confirmInput !== CONFIRM_TEXT) return;
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
    <div className="px-4 py-6 md:p-7 space-y-7 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-x-hidden">
      {isSwitchingProfile ? <LoadingSpinner mode="overlay" /> : null}
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="t3 hidden md:flex font-bold text-foreground mb-1 items-center gap-2 min-w-0">
            <Settings className="h-6 w-6 text-primary shrink-0" />
            <span className="break-words">시스템 설정</span>
          </h1>
          <p className="t7 hidden md:block text-fg-tertiary">
            재무 파라미터 및 인프라 통제 패널
          </p>
        </div>
      </header>

      {/* ── Bento Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Card 1: 예산 기준일 ──────────────────────────────────────────────── */}
        <div className="rounded-card bg-card p-4 md:p-7 flex flex-col gap-6">
          {/* Card header */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-6 shrink-0 items-center justify-center">
              <CalendarDays className="h-5 w-5 text-fg-tertiary" />
            </div>
            <div>
              <h2 className="t5 font-bold text-foreground">
                예산 기준일
              </h2>
              <p className="t7 text-fg-tertiary mt-1">
                월간 예산 통제 기간의 시작일을 설정합니다
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-divider" />

          {/* Select + preview */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="t7 font-medium text-fg-tertiary ml-1">
                월간 예산 기준일
              </label>
              <div className="flex items-center gap-3">
                <ResponsiveSelect
                  value={String(budgetStartDate)}
                  onValueChange={(v) => v && handleBudgetStartChange(v)}
                  options={dayOptions}
                  placeholder="기준일 선택"
                  triggerClassName="w-[160px] t6 h-11 rounded-control border-0 bg-background text-foreground"
                  contentClassName="rounded-control"
                />

                {saveSuccess && (
                  <span className="t7 flex items-center gap-1 font-semibold text-positive animate-in fade-in slide-in-from-left-2 duration-300">
                    <CheckCircle2 className="h-4 w-4" />
                    저장됨
                  </span>
                )}
              </div>
            </div>

            {/* Period preview pill */}
            <div className="rounded-control bg-background px-4 py-3 flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-fg-tertiary shrink-0" />
              <div>
                <p className="t8 text-fg-tertiary mb-1">
                  적용 기간 미리보기
                </p>
                <p className="t6 font-bold text-fg-secondary">
                  {periodPreview}
                </p>
              </div>
            </div>

            <p className="t7 text-fg-tertiary">
              1일이면 당월 1일~말일, 25일이면 당월 25일~익월 24일로 예산 통제 기간이 설정됩니다.
              변경 즉시 /budget 페이지의 기간 표시에 반영됩니다.
            </p>
          </div>
        </div>

        {/* ── Card 2: 데이터 관리 ──────────────────────────────────────────────── */}
        <div className="rounded-card bg-card p-4 md:p-7 flex flex-col gap-6">
          {/* Card header */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-6 shrink-0 items-center justify-center">
              <Database className="h-5 w-5 text-fg-tertiary" />
            </div>
            <div>
              <h2 className="t5 font-bold text-foreground">
                데이터 관리
              </h2>
              <p className="t7 text-fg-tertiary mt-1">
                데이터 백업 및 시스템 초기화
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-divider" />

          {/* CSV Export section */}
          <div className="space-y-3">
            <div>
              <p className="t6 font-semibold text-foreground mb-1">
                CSV 데이터 추출
              </p>
              <p className="t7 text-fg-tertiary mb-3">
                계좌, 현금흐름, 버킷리스트 전체 데이터를 CSV 파일로 내려받습니다.
                Excel에서 바로 열 수 있는 UTF-8 BOM 인코딩으로 저장됩니다.
              </p>
              <Button
                variant="outline"
                size="default"
                className="t6 rounded-control border-0 bg-divider text-foreground hover:bg-divider gap-2 transition-all"
                onClick={handleExportCSV}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? "추출 중…" : "CSV 데이터 추출"}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-auto border-t border-divider pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-negative shrink-0" />
              <h3 className="t6 font-bold text-negative">
                초기화
              </h3>
            </div>
            <p className="t7 text-fg-tertiary mb-4">
              모든 계좌, 예산, 현금흐름, 버킷리스트가 영구 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-control gap-2 bg-negative text-primary-foreground hover:bg-negative hover:opacity-90 transition-all"
              onClick={() => setFactoryResetOpen(true)}
            >
              <AlertTriangle className="h-4 w-4" />
              시스템 초기화
            </Button>
          </div>
        </div>

        <WorkplaceSettingsCard initialWorkplaces={initialWorkplaces} />
      </div>

      {/* ── Current profile ─────────────────────────────────────────────────── */}
      <div className="rounded-card bg-card p-4 md:p-7">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-11 w-6 shrink-0 items-center justify-center">
            <User className="h-5 w-5 text-fg-tertiary" />
          </div>
          <div>
            <h2 className="t5 font-bold text-foreground">
              현재 프로필
            </h2>
            <p className="t7 text-fg-tertiary mt-1">
              이 기기에서 사용 중인 프로필입니다
            </p>
          </div>
        </div>

        <div className="h-px bg-divider mb-6" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-control bg-background px-5 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <span
              className="t5 w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold bg-divider text-fg-secondary"
              aria-hidden
            >
              {currentProfileInitial}
            </span>
            <div className="min-w-0">
              <p className="t6 font-bold text-foreground truncate">
                {currentProfileName}
              </p>
              <p className="t7 text-fg-tertiary mt-1">
                현재 사용 중인 프로필
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="t6 rounded-control border-0 bg-divider text-foreground hover:bg-divider gap-1 shrink-0 self-end sm:self-center"
            onClick={handleSwitchProfile}
            disabled={isSwitchingProfile}
          >
            {isSwitchingProfile ? (
              "전환 중…"
            ) : (
              <>
                전환
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="pt-7 pb-4 text-center space-y-1">
        <p className="t8 numeric text-fg-disabled">
          v1.0.0
        </p>
        <p className="t8 text-fg-disabled">
          © 2026 AlphA Bank. All rights reserved.
        </p>
        <p className="t8 text-fg-disabled">
          A subsidiary of AlphA Inc.
        </p>
      </footer>

      {/* ── Factory Reset Dialog ─────────────────────────────────────────────── */}
      <Dialog open={factoryResetOpen} onOpenChange={setFactoryResetOpen}>
        <DialogContent
          className="sm:max-w-md rounded-card bg-card"
          showCloseButton={true}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <ShieldAlert className="h-5 w-5 shrink-0 text-negative" />
              <DialogTitle className="t5 font-bold text-foreground">
                시스템 초기화 확인
              </DialogTitle>
            </div>
            <DialogDescription className="t7 text-fg-secondary">
              모든 데이터가 영구 삭제됩니다. 계속하려면 아래 입력란에{" "}
              <span className="font-mono font-bold text-foreground bg-divider px-2 py-0.5 rounded-pill">
                {CONFIRM_TEXT}
              </span>
              를 정확히 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="t7 font-medium text-fg-tertiary ml-1">
                확인 문구 입력
              </label>
              <Input
                placeholder={CONFIRM_TEXT}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="t6 h-11 rounded-control border-0 bg-background text-foreground font-mono"
                autoComplete="off"
              />
              {confirmInput.length > 0 && !isConfirmValid && (
                <p className="t7 text-negative ml-1 animate-in fade-in duration-200">
                  입력한 텍스트가 일치하지 않습니다
                </p>
              )}
              {isConfirmValid && (
                <p className="t7 text-positive ml-1 flex items-center gap-1 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4" />
                  확인 완료 — 초기화 버튼이 활성화되었습니다
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setFactoryResetOpen(false);
                  setConfirmInput("");
                }}
                className="rounded-control border-0 bg-divider text-foreground hover:bg-divider"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleFactoryReset}
                disabled={!isConfirmValid || isResetting}
                className="rounded-control gap-2 bg-negative text-primary-foreground hover:bg-negative hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {isResetting ? "초기화 중…" : "초기화 실행"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
