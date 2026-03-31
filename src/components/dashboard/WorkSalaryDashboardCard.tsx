import { Briefcase } from "lucide-react";

function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

type Props = {
  netPay: number;
  activeWorkplaces: number;
  monthLabel: string;
};

export default function WorkSalaryDashboardCard({
  netPay,
  activeWorkplaces,
  monthLabel,
}: Props) {
  const hasWorkplaces = activeWorkplaces > 0;

  return (
    <div
      className="
            bg-white dark:bg-[#18181B] rounded-3xl border border-slate-100 dark:border-white/10
            shadow-[0_8px_30px_rgb(0,0,0,0.04)]
            p-6 flex flex-col min-h-[200px]
            transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl
          "
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Expected net pay
            </p>
            <h2 className="text-lg font-black tracking-tighter text-slate-900 dark:text-slate-100 mt-0.5">
              예상 실수령
            </h2>
          </div>
          <Briefcase className="h-8 w-8 text-primary shrink-0 opacity-90" aria-hidden />
        </div>
        <p className="text-xs text-slate-400 font-medium mb-2">{monthLabel} 기준</p>
        {hasWorkplaces ? (
          <>
            <p className="text-2xl sm:text-3xl font-black tracking-tighter text-primary tabular-nums">
              {formatKRW(netPay)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              활성 근무지 {activeWorkplaces}곳 합산
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            등록된 근무지가 없습니다. 알바 급여 화면에서 근무지를 추가하면 이곳에 표시됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
