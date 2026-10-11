import { formatWon } from "@/lib/format-money";

type Props = {
  /** 다음 지급일 (근무지가 없으면 null) */
  payday: {
    month: number;
    day: number;
    weekday: string;
    daysUntil: number;
    /** 주말·공휴일로 당겨진 경우 원래 지급일 라벨 (예: "10일") */
    originalLabel: string | null;
  } | null;
  netPay: number;
  /** 이번 달 근무 시간 (0이면 "-") */
  workHours: number;
  /** 근무지 표시 (예: "라이노짐 외 1곳") */
  workplaceLabel: string;
  /** 대상 근무월에 근무 기록이 없음 → 실수령 "근무 기록 없음", 근무 시간 "기록 없음" */
  noRecords: boolean;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="t6 font-medium text-fg-secondary">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

export default function PaydayHero({ payday, netPay, workHours, workplaceLabel, noRecords }: Props) {
  return (
    <div className="flex flex-col rounded-card bg-card px-6 py-5">
      {payday ? (
        <>
          <p className="t7 text-fg-tertiary">
            {payday.month}월 {payday.day}일 {payday.weekday} 입금 예정
            {payday.originalLabel && ` (원래 ${payday.originalLabel})`}
          </p>
          <p className="t3 mt-1 font-bold text-foreground">
            {payday.daysUntil === 0 ? (
              <>
                오늘 <span className="text-primary">월급날</span>이에요
              </>
            ) : (
              <>
                월급까지 <span className="numeric text-primary">{payday.daysUntil}일</span> 남았어요
              </>
            )}
          </p>

          <div className="mt-4 divide-y divide-divider">
            <Row label="예상 실수령">
              {noRecords ? (
                <span className="t6 text-fg-tertiary">근무 기록 없음</span>
              ) : (
                <span className="t4 numeric font-bold">{formatWon(netPay)}</span>
              )}
            </Row>
            <Row label="이번 달 근무">
              {noRecords ? (
                <span className="t6 text-fg-tertiary">기록 없음</span>
              ) : (
                <span className="t6 numeric font-semibold">{workHours > 0 ? `${workHours}시간` : "-"}</span>
              )}
            </Row>
            <Row label="근무지">
              <span className="t6 font-semibold">{workplaceLabel}</span>
            </Row>
          </div>
        </>
      ) : (
        <>
          <p className="t5 font-bold text-foreground">월급 정보가 없어요</p>
          <p className="t7 mt-1 text-fg-tertiary">급여 계산기에서 근무지를 추가하면 월급날을 알려드려요.</p>
        </>
      )}
    </div>
  );
}
