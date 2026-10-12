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
