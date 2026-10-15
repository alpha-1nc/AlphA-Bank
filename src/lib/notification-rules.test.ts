import { describe, expect, it } from "vitest";
import { getDueNotifications, type RuleInput } from "@/lib/notification-rules";

const base: RuleInput = {
  now: new Date("2026-10-01T01:00:00Z"), // KST 10:00
  settings: { notifyBudgetStart: true, notifyUncompleted: true, notifyPaydayEve: true, notifyMidCycle: true },
  budgetStartDate: 1,
  currentItems: [
    { type: "EXPENSE", isCompleted: false },
    { type: "EXPENSE", isCompleted: false },
    { type: "SAVING", isCompleted: false },
  ],
  workplaces: [],
};
const at = (iso: string, over: Partial<RuleInput> = {}) => getDueNotifications({ ...base, now: new Date(iso), ...over });
const types = (r: ReturnType<typeof at>) => r.map((d) => d.type);

describe("notification rules (KST)", () => {
  it("budget_start: 다음 기간(11/1) 7일 전 = 10/25", () => {
    expect(types(at("2026-10-25T01:00:00Z"))).toContain("budget_start");
    expect(types(at("2026-10-24T01:00:00Z"))).not.toContain("budget_start");
  });
  it("uncompleted: 기간 종료(10/31) 전날 10/30, 0개면 안 보냄", () => {
    expect(at("2026-10-30T01:00:00Z").find((d) => d.type === "uncompleted")?.title).toContain("3개");
    expect(types(at("2026-10-30T01:00:00Z", { currentItems: [] }))).not.toContain("uncompleted");
  });
  it("uncompleted: 수입은 세지 않고, 집행 완료 항목도 제외", () => {
    const items = [
      { type: "INCOME", isCompleted: false },
      { type: "INCOME", isCompleted: false },
      { type: "EXPENSE", isCompleted: false },
      { type: "EXPENSE", isCompleted: true },
      { type: "SAVING", isCompleted: false },
    ];
    expect(at("2026-10-30T01:00:00Z", { currentItems: items }).find((d) => d.type === "uncompleted")?.title).toContain("2개");
    const onlyIncome = [{ type: "INCOME", isCompleted: false }];
    expect(types(at("2026-10-30T01:00:00Z", { currentItems: onlyIncome }))).not.toContain("uncompleted");
  });
  it("UTC 15:30 은 KST 다음 날로 판정", () => {
    expect(types(at("2026-10-29T15:30:00Z"))).toContain("uncompleted"); // KST 10/30 00:30
  });
  it("payday_eve / mid_cycle: 재직 근무지가 있을 때만", () => {
    const wp = [{ name: "카페", isActive: true, paydayOfMonth: 20 }]; // 2026-10-20 화
    expect(types(at("2026-10-19T01:00:00Z", { workplaces: wp }))).toContain("payday_eve");
    expect(types(at("2026-10-19T01:00:00Z", { workplaces: [{ ...wp[0], isActive: false }] }))).not.toContain("payday_eve");
    expect(types(at("2026-11-04T01:00:00Z", { workplaces: wp }))).toContain("mid_cycle");
  });
  it("설정이 꺼져 있으면 건너뜀", () => {
    const s = { ...base.settings, notifyBudgetStart: false };
    expect(types(at("2026-10-25T01:00:00Z", { settings: s }))).not.toContain("budget_start");
  });
});
