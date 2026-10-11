/**
 * CashFlow 분류 단일 소스.
 * type = 섹션(INCOME / EXPENSE / SAVING), category = 섹션 내 카테고리 키.
 * 화면·서버 액션·검증·집계는 모두 이 파일만 참조한다.
 */

export const CASHFLOW_SECTIONS = ["INCOME", "EXPENSE", "SAVING"] as const;
export type CashFlowSection = (typeof CASHFLOW_SECTIONS)[number];

export const SECTION_LABELS: Record<CashFlowSection, string> = {
  INCOME: "수입",
  EXPENSE: "지출",
  SAVING: "저축·투자",
};

/** 섹션별 카테고리 키 → 라벨 (INCOME은 카테고리 없음) */
export const CATEGORY_LABELS = {
  INCOME: {},
  EXPENSE: {
    FIXED: "고정지출",
    VARIABLE: "변동지출",
    SPECIAL: "특별지출",
  },
  SAVING: {
    SAVE: "저축",
    INVEST: "투자",
    PURPOSE: "목적자금",
  },
} as const satisfies Record<CashFlowSection, Record<string, string>>;

export type ExpenseCategory = keyof (typeof CATEGORY_LABELS)["EXPENSE"];
export type SavingCategory = keyof (typeof CATEGORY_LABELS)["SAVING"];
export type CashFlowCategory = ExpenseCategory | SavingCategory;

export const EXPENSE_CATEGORY = {
  FIXED: "FIXED",
  VARIABLE: "VARIABLE",
  SPECIAL: "SPECIAL",
} as const satisfies Record<ExpenseCategory, ExpenseCategory>;

export const SAVING_CATEGORY = {
  SAVE: "SAVE",
  INVEST: "INVEST",
  PURPOSE: "PURPOSE",
} as const satisfies Record<SavingCategory, SavingCategory>;

/** 섹션에 속한 카테고리 키 목록 (INCOME은 빈 배열) */
export function getCategoryKeys(section: CashFlowSection): string[] {
  return Object.keys(CATEGORY_LABELS[section]);
}

export function isCashFlowSection(v: unknown): v is CashFlowSection {
  return typeof v === "string" && (CASHFLOW_SECTIONS as readonly string[]).includes(v);
}

export function sectionHasCategories(section: CashFlowSection): boolean {
  return getCategoryKeys(section).length > 0;
}

/** 카테고리 키 → 라벨. 알 수 없으면 null */
export function getCategoryLabel(section: string, category: string | null | undefined): string | null {
  if (!category || !isCashFlowSection(section)) return null;
  const map = CATEGORY_LABELS[section] as Record<string, string>;
  return map[category] ?? null;
}

/** 섹션·카테고리 조합이 유효한지 검증 후 저장용 값으로 정규화. 유효하지 않으면 null */
export function normalizeSectionCategory(
  section: unknown,
  category: unknown
): { type: CashFlowSection; category: string | null } | null {
  if (!isCashFlowSection(section)) return null;
  const keys = getCategoryKeys(section);
  if (keys.length === 0) return { type: section, category: null };
  if (typeof category !== "string" || !keys.includes(category)) return null;
  return { type: section, category };
}

/** 섹션 선택 시 기본 카테고리 (INCOME은 null) */
export function getDefaultCategory(section: CashFlowSection): string | null {
  return getCategoryKeys(section)[0] ?? null;
}

/**
 * 이모지 입력 정규화: 비어 있으면 null, 한 글자(grapheme)만 사용.
 * pick="last"는 입력란에서 새로 입력한 글자가 기존 글자를 대체하도록 마지막 글자를 사용.
 */
export function normalizeEmoji(v: unknown, pick: "first" | "last" = "first"): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  const chars = Seg
    ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(trimmed), (x) => x.segment)
    : Array.from(trimmed);
  const g = pick === "last" ? chars[chars.length - 1] : chars[0];
  return g ?? null;
}

/** 지출 합산 대상 판별 (FIXED + VARIABLE + SPECIAL 전부 → type 기준) */
export function isExpenseType(type: string): boolean {
  return type === "EXPENSE";
}
