import type { AccountType } from "./asset-constants";

/** 은행/금융기관: 표시명, DB 저장값, 로고 파일명 */
export interface BankOption {
  displayName: string;
  value: string;
  logoFile: string;
}

/** 입출금/금고/저축용 은행 (이름 = 파일명) */
const BANKS_DEPOSIT: BankOption[] = [
  { displayName: "국민은행", value: "국민은행", logoFile: "국민은행.svg" },
  { displayName: "농협", value: "농협", logoFile: "농협.svg" },
  { displayName: "새마을금고", value: "새마을금고", logoFile: "새마을금고.svg" },
  { displayName: "시티은행", value: "시티은행", logoFile: "시티은행.svg" },
  { displayName: "신한은행", value: "신한은행", logoFile: "신한은행.svg" },
  { displayName: "우리은행", value: "우리은행", logoFile: "우리은행.svg" },
  { displayName: "우체국", value: "우체국", logoFile: "우체국.svg" },
  { displayName: "제일은행", value: "제일은행", logoFile: "제일은행.svg" },
  { displayName: "카카오뱅크", value: "카카오뱅크", logoFile: "카카오뱅크.svg" },
  { displayName: "토스뱅크", value: "토스뱅크", logoFile: "토스뱅크.svg" },
  { displayName: "하나은행", value: "하나은행", logoFile: "하나은행.svg" },
  { displayName: "IBK기업은행", value: "IBK기업은행", logoFile: "IBK기업은행.svg" },
];

/** 증권/연금용 금융기관 (토스뱅크 → 토스증권 표시) */
const BANKS_INVESTMENT: BankOption[] = [
  { displayName: "키움증권", value: "키움증권", logoFile: "키움증권.svg" },
  { displayName: "토스증권", value: "토스증권", logoFile: "토스뱅크.svg" },
  { displayName: "한국투자증권", value: "한국투자증권", logoFile: "한국투자증권.svg" },
  { displayName: "미래에셋증권", value: "미래에셋증권", logoFile: "미래에셋증권.svg" },
];

const DEPOSIT_TYPES: AccountType[] = ["입출금", "금고", "저축"];
const INVESTMENT_TYPES: AccountType[] = ["증권", "연금"];

export function getBanksByType(type: AccountType): BankOption[] {
  if (DEPOSIT_TYPES.includes(type)) return BANKS_DEPOSIT;
  if (INVESTMENT_TYPES.includes(type)) return BANKS_INVESTMENT;
  return [];
}

/** bankName으로 로고 경로 반환. DB에 저장된 이름과 매칭 */
const LOGO_MAP: Record<string, string> = {
  국민은행: "국민은행.svg",
  농협: "농협.svg",
  새마을금고: "새마을금고.svg",
  시티은행: "시티은행.svg",
  신한은행: "신한은행.svg",
  우리은행: "우리은행.svg",
  우체국: "우체국.svg",
  제일은행: "제일은행.svg",
  카카오뱅크: "카카오뱅크.svg",
  토스뱅크: "토스뱅크.svg",
  토스증권: "토스뱅크.svg",
  하나은행: "하나은행.svg",
  "IBK기업은행": "IBK기업은행.svg",
  키움증권: "키움증권.svg",
  한국투자증권: "한국투자증권.svg",
  미래에셋증권: "미래에셋증권.svg",
};

export function getBankLogoPath(bankName: string | null): string | null {
  if (!bankName?.trim()) return null;
  const file = LOGO_MAP[bankName.trim()];
  return file ? `/bank_logos/${file}` : null;
}
