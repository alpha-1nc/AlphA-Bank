import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "오프라인",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">연결 없음</p>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        네트워크에 연결되어 있지 않습니다. 와이파이 또는 데이터 연결을 확인한 뒤 다시 시도해 주세요.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        다시 시도
      </Link>
    </div>
  );
}
