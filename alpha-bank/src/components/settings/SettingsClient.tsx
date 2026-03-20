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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

export default function SettingsClient({ initialBudgetStartDate }: SettingsClientProps) {
  const [budgetStartDate, setBudgetStartDate] = useState(initialBudgetStartDate);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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
    return `전월 ${budgetStartDate}일 ~ 당월 ${budgetStartDate - 1}일`;
  })();

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 min-h-full max-w-[1600px] mx-auto min-w-0 overflow-hidden">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-2.5 min-w-0">
            <Settings className="h-8 w-8 text-primary shrink-0" />
            <span className="break-words">시스템 설정</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            재무 파라미터 및 인프라 통제 패널
          </p>
        </div>
      </header>

      {/* ── Bento Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Card 1: 재무 코어 파라미터 ─────────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col gap-6">
          {/* Card header */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                재무 코어 파라미터
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                월간 예산 통제 기간의 시작일을 설정합니다
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-white/5" />

          {/* Select + preview */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                월간 예산 기준일 (Budget Cycle Start Date)
              </label>
              <div className="flex items-center gap-3">
                <Select
                  value={String(budgetStartDate)}
                  onValueChange={(v) => v && handleBudgetStartChange(v)}
                >
                  <SelectTrigger className="w-[160px] rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 h-11">
                    <SelectValue placeholder="기준일 선택" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {dayOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 animate-in fade-in slide-in-from-left-2 duration-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    저장됨
                  </span>
                )}
              </div>
            </div>

            {/* Period preview pill */}
            <div className="rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 px-4 py-3 flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">
                  적용 기간 미리보기
                </p>
                <p className="text-sm font-bold text-primary">
                  {periodPreview}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              1일이면 당월 1일~말일, 25일이면 전월 25일~당월 24일로 예산 통제 기간이 설정됩니다.
              변경 즉시 /budget 페이지의 기간 표시에 반영됩니다.
            </p>
          </div>
        </div>

        {/* ── Card 2: 데이터 및 인프라 통제 ──────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col gap-6">
          {/* Card header */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
              <Database className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                데이터 및 인프라 통제
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                데이터 백업 및 시스템 초기화
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-white/5" />

          {/* CSV Export section */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CSV 데이터 추출
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-3">
                계좌, 현금흐름, 버킷리스트 전체 데이터를 CSV 파일로 내려받습니다.
                Excel에서 바로 열 수 있는 UTF-8 BOM 인코딩으로 저장됩니다.
              </p>
              <Button
                variant="outline"
                size="default"
                className="rounded-2xl border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 gap-2 transition-all"
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
          <div className="mt-auto rounded-2xl border border-red-200/60 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/5 p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 tracking-tight">
                Danger Zone
              </h3>
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 leading-relaxed mb-4">
              모든 계좌, 예산, 현금흐름, 버킷리스트가 영구 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl gap-2 bg-red-500 hover:bg-red-600 dark:bg-red-600/80 dark:hover:bg-red-600 text-white shadow-sm shadow-red-500/20 transition-all"
              onClick={() => setFactoryResetOpen(true)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              시스템 초기화 (Factory Reset)
            </Button>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="pt-8 pb-4 text-center space-y-0.5">
        <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
          v1.0.0
        </p>
        <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500">
          © 2026 AlphA Bank. All rights reserved.
        </p>
        <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500">
          A subsidiary of AlphA Inc.
        </p>
      </footer>

      {/* ── Factory Reset Dialog ─────────────────────────────────────────────── */}
      <Dialog open={factoryResetOpen} onOpenChange={setFactoryResetOpen}>
        <DialogContent
          className="sm:max-w-md rounded-3xl border border-slate-100 dark:border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.12)] bg-white dark:bg-[#18181B] backdrop-blur-xl"
          showCloseButton={true}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tighter text-slate-900 dark:text-slate-100">
                시스템 초기화 확인
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              모든 데이터가 영구 삭제됩니다. 계속하려면 아래 입력란에{" "}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                {CONFIRM_TEXT}
              </span>
              를 정확히 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                확인 문구 입력
              </label>
              <Input
                placeholder={CONFIRM_TEXT}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#09090B] dark:text-slate-100 font-mono h-11"
                autoComplete="off"
              />
              {confirmInput.length > 0 && !isConfirmValid && (
                <p className="text-xs text-red-500 dark:text-red-400 ml-1 animate-in fade-in duration-200">
                  입력한 텍스트가 일치하지 않습니다
                </p>
              )}
              {isConfirmValid && (
                <p className="text-xs text-emerald-500 ml-1 flex items-center gap-1 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-3 w-3" />
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
                className="rounded-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleFactoryReset}
                disabled={!isConfirmValid || isResetting}
                className="rounded-xl gap-2 bg-red-500 hover:bg-red-600 dark:bg-red-600/80 dark:hover:bg-red-600 disabled:opacity-40 transition-all"
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
