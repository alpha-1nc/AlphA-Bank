import { describe, expect, it } from "vitest";
import { getBudgetPeriodRange } from "@/lib/budget-period";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const range = (month: string, start: number) => {
  const r = getBudgetPeriodRange(month, start);
  return `${ymd(r.start)} ~ ${ymd(r.end)}`;
};

describe("getBudgetPeriodRange", () => {
  it("기준일 10, 2026년 10월 → 10/10 ~ 11/09", () => {
    expect(range("2026-10", 10)).toBe("2026-10-10 ~ 2026-11-09");
  });

  it("기준일 1, 2026년 10월 → 10/01 ~ 10/31", () => {
    expect(range("2026-10", 1)).toBe("2026-10-01 ~ 2026-10-31");
  });

  it("기준일 31, 2026년 1월 → 1/31 ~ 2/27 (2월은 말일 2/28이 시작이므로 그 전날까지)", () => {
    expect(range("2026-01", 31)).toBe("2026-01-31 ~ 2026-02-27");
  });

  it("기준일 31, 2026년 2월 → 말일 2/28 시작 ~ 3/30", () => {
    expect(range("2026-02", 31)).toBe("2026-02-28 ~ 2026-03-30");
  });

  it("기준일 10, 2026년 12월 → 다음 해 1/09까지", () => {
    expect(range("2026-12", 10)).toBe("2026-12-10 ~ 2027-01-09");
  });
});
