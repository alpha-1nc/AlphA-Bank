import { describe, expect, it } from "vitest";
import { formatKstDateKey } from "@/lib/kst-date-key";
import { getNextPayday, resolvePayday } from "@/lib/payday";

const key = (y: number, m: number, d: number) => formatKstDateKey(resolvePayday(y, m, d));
const kstNoon = (s: string) => new Date(`${s}T12:00:00+09:00`);

describe("resolvePayday", () => {
  it("평일 지급일은 그대로", () => {
    expect(key(2026, 10, 8)).toBe("2026-10-08"); // 목
  });

  it("토요일 → 직전 금요일", () => {
    expect(key(2026, 11, 7)).toBe("2026-11-06"); // 토 → 금
  });

  it("토요일인데 직전 금요일이 공휴일이면 그 전 평일 (한글날)", () => {
    expect(key(2026, 10, 10)).toBe("2026-10-08"); // 토 → 금(10/9 한글날) → 목
  });

  it("일요일 → 직전 금요일", () => {
    expect(key(2026, 11, 8)).toBe("2026-11-06");
  });

  it("공휴일이면 그 전 평일로", () => {
    expect(key(2026, 12, 25)).toBe("2026-12-24"); // 크리스마스(금) → 목
  });

  it("연휴가 길면 연휴 이전 평일까지 당겨진다", () => {
    expect(key(2027, 2, 8)).toBe("2027-02-05"); // 설 연휴(2/6~2/9) → 금
    expect(key(2027, 2, 9)).toBe("2027-02-05");
    expect(key(2026, 9, 25)).toBe("2026-09-23"); // 추석 연휴(9/24~9/26) → 수
  });

  it("말일보다 큰 paydayOfMonth는 말일로 처리", () => {
    expect(key(2027, 2, 31)).toBe("2027-02-26"); // 2/28(일) → 금
    expect(key(2026, 2, 31)).toBe("2026-02-27"); // 2/28(토) → 금
    expect(key(2026, 4, 31)).toBe("2026-04-30"); // 4/30(목)
  });
});

describe("getNextPayday", () => {
  it("이번 달 지급일이 오늘이면 이번 달, daysUntil 0", () => {
    const r = getNextPayday(8, kstNoon("2026-10-08"));
    expect(formatKstDateKey(r.date)).toBe("2026-10-08");
    expect(r.daysUntil).toBe(0);
  });

  it("이번 달 지급일이 아직 안 지났으면 이번 달", () => {
    const r = getNextPayday(8, kstNoon("2026-10-01"));
    expect(formatKstDateKey(r.date)).toBe("2026-10-08");
    expect(r.daysUntil).toBe(7);
  });

  it("이번 달 지급일이 지났으면 다음 달 (보정 반영)", () => {
    const r = getNextPayday(8, kstNoon("2026-10-09"));
    expect(formatKstDateKey(r.date)).toBe("2026-11-06"); // 11/8 일 → 11/6 금
    expect(r.daysUntil).toBe(28);
  });

  it("연말에서 다음 해로 넘어간다", () => {
    const r = getNextPayday(10, kstNoon("2026-12-20"));
    expect(formatKstDateKey(r.date)).toBe("2027-01-08"); // 1/10 일 → 1/8 금
    expect(r.daysUntil).toBe(19);
  });
});
