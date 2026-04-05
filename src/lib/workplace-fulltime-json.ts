import type { Allowance } from "@/types/allowance";

export function allowancesToJsonValue(allowances: Allowance[]): unknown {
  return JSON.parse(JSON.stringify(allowances));
}

export function allowancesFromJsonValue(value: unknown): Allowance[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Allowance =>
      v !== null &&
      typeof v === "object" &&
      typeof v.id === "string" &&
      typeof v.name === "string" &&
      typeof v.amount === "number" &&
      typeof v.isTaxExempt === "boolean"
  );
}
