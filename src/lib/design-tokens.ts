import { colors, darkCSS, getDarkColor, getLightColor, lightCSS } from "@toss/tds-colors";

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

/**
 * 무채색·상태색은 TDS adaptive 색(라이트/다크 쌍)에서 가져온다.
 * TDS 다크는 반전 스케일(다크 grey900 = #ffffff)이라, 이름이 같은 adaptive 키를 고르면
 * 라이트·다크 모두 같은 "역할"의 색이 나온다. accent 계열만 AlphA Bank 값을 쓴다.
 */
type AdaptiveKey = Parameters<typeof getLightColor>[0];
const ADAPTIVE: Record<Exclude<keyof ThemeTokens, "accent" | "accentSoft" | "onAccent">, AdaptiveKey> = {
  background: "greyBackground", // 라이트 #f2f4f6 / 다크 #101013
  card: "backgroundLevel01", // #ffffff / #202027
  divider: "grey100", // #f2f4f6 / #2c2c35
  border: "grey200", // #e5e8eb / #3c3c47
  foreground: "grey900", // #191f28 / #ffffff
  secondaryFg: "grey700", // #4e5968 / #c3c3c6
  tertiaryFg: "grey500", // #8b95a1 / #7e7e87
  disabledFg: "grey400", // #b0b8c1 / #62626d
  positive: "green400", // #15c47e / #13a065
  negative: "red500", // #f04452 / #f04251
};

function fromAdaptive(pick: (k: AdaptiveKey) => string) {
  return Object.fromEntries(
    Object.entries(ADAPTIVE).map(([role, key]) => [role, pick(key)])
  ) as Record<keyof typeof ADAPTIVE, string>;
}

export const lightTokens: ThemeTokens = {
  ...fromAdaptive(getLightColor),
  accent: ALPHA_ACCENT,
  accentSoft: "#e9f4fc", // blue50 자리
  onAccent: colors.white,
};

export const darkTokens: ThemeTokens = {
  ...fromAdaptive(getDarkColor),
  accent: ALPHA_ACCENT_DARK,
  accentSoft: "rgba(75,166,227,0.16)",
  onAccent: colors.white,
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

/**
 * Badge 색 (TDS Badge의 teal/green/red/yellow). blue·grey는 accent·무채색 토큰을 쓰므로 여기 없음.
 * --tk-badge-{color}-fill / -soft(weak 배경) / -text(weak 글자)
 */
type BadgeHue = "teal" | "green" | "red" | "yellow";
const BADGE_HUES: BadgeHue[] = ["teal", "green", "red", "yellow"];

/** 라이트 weak 글자: 연한 배경(50) 위 대비 4.5 이상이 되는 단계 (700은 teal 4.1·green 3.7·yellow 2.0으로 부족) */
const LIGHT_WEAK_TEXT: Record<BadgeHue, string> = {
  teal: colors.teal800, // 5.1
  green: colors.green900, // 5.4
  red: colors.red700, // 4.7
  yellow: colors.grey900, // 노랑 계열은 어느 단계도 4.5 미달
};

function badgeDeclarations(isDark: boolean): string {
  return BADGE_HUES.map((hue) => {
    const H = hue.charAt(0).toUpperCase() + hue.slice(1);
    const c = colors as Record<string, string>;
    const fill = isDark ? c[`darkTheme${H}500`] : c[`${hue}500`];
    const soft = isDark ? c[`darkTheme${H}50`] : c[`${hue}50`];
    const text = isDark ? c[`darkTheme${H}700`] : LIGHT_WEAK_TEXT[hue];
    return `--tk-badge-${hue}-fill:${fill};--tk-badge-${hue}-soft:${soft};--tk-badge-${hue}-text:${text};`;
  }).join("") + `--tk-badge-yellow-on:${colors.grey900};`; // 노란 fill 위 글자 (흰 글자는 대비 부족)
}

/**
 * :root·.light(라이트) / .dark(다크) 용 --tk-* 변수 CSS.
 * .light는 다크 화면 안에서 일부 영역만 라이트로 보여줄 때 쓴다 (/ui-preview).
 */
export function buildTokenCSS(): string {
  // lightCSS/darkCSS: TDS --adaptive* 변수 (선택자 없는 선언 문자열이라 테마 범위로 감싼다)
  return `:root,.light{${lightCSS}${toDeclarations(lightTokens)}${badgeDeclarations(false)}}.dark{${darkCSS}${toDeclarations(darkTokens)}${badgeDeclarations(true)}}`;
}

/** 차트 등 JS에서 색이 필요할 때 */
export function getThemeTokens(isDark: boolean): ThemeTokens {
  return isDark ? darkTokens : lightTokens;
}
