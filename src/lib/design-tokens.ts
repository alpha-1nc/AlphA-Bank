import { colors } from "@toss/tds-colors";

/**
 * AlphA Bank 디자인 토큰 단일 소스.
 * 색은 @toss/tds-colors 팔레트를 그대로 쓰고, 패키지에 없는 값(AlphA Bank 포인트 컬러,
 * 일부 다크 전용 값)만 직접 지정한다. 화면·CSS는 hex를 직접 쓰지 말고 여기를 거친다.
 *
 * CSS 변수(--tk-*)는 buildTokenCSS()로 생성되어 layout에서 주입되고,
 * globals.css의 기존 토큰(--background, --card, --primary …)이 이를 참조한다.
 */

/** AlphA Bank 포인트 컬러 (tds blue500 자리를 대체) */
const ALPHA_ACCENT = "#3498DB";
const ALPHA_ACCENT_DARK = "#4ba6e3";

export type ThemeTokens = {
  background: string;
  card: string;
  /** 카드 내부 행 구분선 */
  divider: string;
  border: string;
  foreground: string;
  secondaryFg: string;
  tertiaryFg: string;
  disabledFg: string;
  accent: string;
  accentSoft: string;
  /** accent 배경 위 글자색 */
  onAccent: string;
  positive: string;
  negative: string;
};

export const lightTokens: ThemeTokens = {
  background: colors.grey100, // #f2f4f6
  card: colors.white, // #ffffff
  divider: colors.grey100, // #f2f4f6
  border: colors.grey200, // #e5e8eb
  foreground: colors.grey900, // #191f28
  secondaryFg: colors.grey700, // #4e5968
  tertiaryFg: colors.grey500, // #8b95a1
  disabledFg: colors.grey400, // #b0b8c1
  accent: ALPHA_ACCENT,
  accentSoft: "#e9f4fc", // blue50 자리
  onAccent: colors.white,
  positive: colors.green400, // #15c47e
  negative: colors.red500, // #f04452
};

export const darkTokens: ThemeTokens = {
  background: colors.darkThemeBackground, // #17171c
  card: colors.darkThemeBackgroundLevel01, // #202027
  divider: "#2b2b33",
  border: "#2b2b33",
  foreground: "#f4f5f7",
  secondaryFg: colors.grey400, // #b0b8c1
  tertiaryFg: colors.grey500, // #8b95a1
  disabledFg: colors.grey600, // #6b7684
  accent: ALPHA_ACCENT_DARK,
  accentSoft: "rgba(75,166,227,0.16)",
  onAccent: colors.white,
  positive: colors.green300, // #3fd599
  negative: colors.red400, // #f66570
};

const CSS_VAR_NAMES: Record<keyof ThemeTokens, string> = {
  background: "--tk-background",
  card: "--tk-card",
  divider: "--tk-divider",
  border: "--tk-border",
  foreground: "--tk-foreground",
  secondaryFg: "--tk-secondary-fg",
  tertiaryFg: "--tk-tertiary-fg",
  disabledFg: "--tk-disabled-fg",
  accent: "--tk-accent",
  accentSoft: "--tk-accent-soft",
  onAccent: "--tk-on-accent",
  positive: "--tk-positive",
  negative: "--tk-negative",
};

function toDeclarations(t: ThemeTokens): string {
  return (Object.keys(CSS_VAR_NAMES) as (keyof ThemeTokens)[])
    .map((k) => `${CSS_VAR_NAMES[k]}:${t[k]};`)
    .join("");
}

/** :root(라이트) / .dark(다크) 용 --tk-* 변수 CSS */
export function buildTokenCSS(): string {
  return `:root{${toDeclarations(lightTokens)}}.dark{${toDeclarations(darkTokens)}}`;
}

/** 차트 등 JS에서 색이 필요할 때 */
export function getThemeTokens(isDark: boolean): ThemeTokens {
  return isDark ? darkTokens : lightTokens;
}
