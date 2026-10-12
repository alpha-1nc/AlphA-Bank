import type { TextFieldFormat } from "@/components/ui";

/** 숫자만 남김: "1,846,000원" → "1846000" */
export function parseNumberInput(input: string): string {
  return input.replace(/\D/g, "");
}

/** 천단위 콤마 표시: "1846000" → "1,846,000" (앞자리 0 제거, 빈 값은 그대로) */
export function formatNumberInput(input: string): string {
  const digits = parseNumberInput(input);
  if (!digits) return "";
  const trimmed = digits.replace(/^0+(?=\d)/, "");
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 금액 입력 칸용 TextField format.
 * 사용: <TextField type="text" inputMode="numeric" format={AMOUNT_INPUT_FORMAT} value={digits} onChange={(e) => setDigits(e.target.value)} />
 * state·onChange 의 값은 콤마 없는 순수 숫자 문자열.
 */
export const AMOUNT_INPUT_FORMAT: TextFieldFormat = {
  transform: formatNumberInput,
  reset: parseNumberInput,
};

/** 부호 있는 숫자 입력 정리: 어디에 있든 "-"가 있으면 음수. "-"만 있으면 그대로 둔다 (타이핑 중). */
export function parseSignedNumberInput(input: string): string {
  const negative = input.includes("-");
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${digits}`;
}

/** 부호 있는 천단위 콤마 표시: "-50000" → "-50,000" */
export function formatSignedNumberInput(input: string): string {
  const raw = parseSignedNumberInput(input);
  if (raw === "" || raw === "-") return raw;
  const negative = raw.startsWith("-");
  const body = (negative ? raw.slice(1) : raw).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${body}` : body;
}

/** 음수를 허용하는 금액 입력 칸용 TextField format. state·onChange 의 값은 콤마 없는 문자열("-50000"). */
export const SIGNED_AMOUNT_INPUT_FORMAT: TextFieldFormat = {
  transform: formatSignedNumberInput,
  reset: parseSignedNumberInput,
};
