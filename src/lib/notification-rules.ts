import { getBudgetPeriodRange } from "@/lib/budget-period";
import { formatKstDateKey } from "@/lib/kst-date-key";
import { getNextPayday, resolvePayday } from "@/lib/payday";
import { addDaysToKey, getKstNow, localDateToKey } from "@/lib/kst-now";

export type NotificationType = "budget_start" | "uncompleted" | "payday_eve" | "mid_cycle";

export interface NotificationRuleSettings {
  notifyBudgetStart: boolean;
  notifyUncompleted: boolean;
  notifyPaydayEve: boolean;
  notifyMidCycle: boolean;
}

export interface RuleWorkplace {
  name: string;
  isActive: boolean;
  paydayOfMonth: number;
}

export interface RuleInput {
  now: Date;
  settings: NotificationRuleSettings;
  budgetStartDate: number;
  /** 현재 예산 월의 현금흐름 항목. 미집행 개수는 지출·저축만 센다(수입은 기간 뒤에 들어오므로 제외). */
  currentItems: Array<{ type: string; isCompleted: boolean }>;
  workplaces: RuleWorkplace[];
}

export interface DueNotification {
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** KST 오늘 기준 현재 예산 월(YYYY-MM). getCurrentBudgetMonth 와 같은 규칙을 KST 로 계산 */
export function getCurrentBudgetMonthKst(budgetStartDate: number, now: Date): string {
  const k = getKstNow(now);
  let y = k.year;
  let m = k.month;
  if (k.day < (budgetStartDate || 1)) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function joinNames(names: string[]): string {
  return names.length <= 2 ? names.join(", ") : `${names[0]} 외 ${names.length - 1}곳`;
}

export function getDueNotifications(input: RuleInput): DueNotification[] {
  const { now, settings, budgetStartDate } = input;
  const uncompletedCount = input.currentItems.filter(
    (i) => !i.isCompleted && (i.type === "EXPENSE" || i.type === "SAVING"),
  ).length;
  const today = getKstNow(now);
  const due: DueNotification[] = [];

  const month = getCurrentBudgetMonthKst(budgetStartDate, now);
  const range = getBudgetPeriodRange(month, budgetStartDate);
  const periodEndKey = localDateToKey(range.end);
  const nextStartKey = addDaysToKey(periodEndKey, 1);

  // 다음 예산 기간 시작 7일 전
  if (settings.notifyBudgetStart && addDaysToKey(nextStartKey, -7) === today.key) {
    due.push({
      type: "budget_start",
      title: "곧 새 예산 기간이 시작돼요",
      body: "7일 뒤부터 새 기간이에요. 미리 예산을 짜두면 편해요",
      url: "/budget",
      tag: "budget_start",
    });
  }

  // 기간 끝 하루 전 미집행 항목
  if (settings.notifyUncompleted && addDaysToKey(periodEndKey, -1) === today.key && uncompletedCount > 0) {
    due.push({
      type: "uncompleted",
      title: `아직 집행 안 한 항목이 ${uncompletedCount}개 있어요`,
      body: "이번 예산 기간이 내일 끝나요",
      url: "/budget",
      tag: "uncompleted",
    });
  }

  const active = input.workplaces.filter((w) => w.isActive);

  // 월급 전날 (보정된 실제 지급일 - 1일)
  if (settings.notifyPaydayEve && active.length > 0) {
    const names = active
      .filter((w) => addDaysToKey(formatKstDateKey(getNextPayday(w.paydayOfMonth, now).date), -1) === today.key)
      .map((w) => w.name);
    if (names.length > 0) {
      due.push({
        type: "payday_eve",
        title: "내일 월급날이에요",
        body: `${joinNames(names)}에서 입금될 예정이에요`,
        url: "/work",
        tag: "payday_eve",
      });
    }
  }

  // 월급 +15일 (가장 최근 보정된 지급일 기준)
  if (settings.notifyMidCycle && active.length > 0) {
    const hit = active.some((w) => {
      const thisMonth = formatKstDateKey(resolvePayday(today.year, today.month, w.paydayOfMonth));
      const pm = today.month === 1 ? { y: today.year - 1, m: 12 } : { y: today.year, m: today.month - 1 };
      const prevMonth = formatKstDateKey(resolvePayday(pm.y, pm.m, w.paydayOfMonth));
      const latest = thisMonth <= today.key ? thisMonth : prevMonth;
      return addDaysToKey(latest, 15) === today.key;
    });
    if (hit) {
      due.push({
        type: "mid_cycle",
        title: "월급 받은 지 15일 지났어요",
        body: "이번 기간 예산을 한 번 점검해 보세요",
        url: "/budget",
        tag: "mid_cycle",
      });
    }
  }

  return due;
}
