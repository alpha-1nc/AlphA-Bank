"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { ActionResult } from "@/actions/action-types";
import type { Workplace } from "@/generated/prisma";
import { normalizeWorkplaceForClient } from "@/lib/workplace-client";
import { syncWorkplaceIncomeBudgetLines } from "@/lib/work-budget-sync";
import { WORKPLACE_TYPE } from "@/lib/workplace-type";
import { allowancesToJsonValue } from "@/lib/workplace-fulltime-json";
import type { Prisma } from "@/generated/prisma";
import { computeOrdinaryHourlyWage } from "@/utils/fulltime-calculator";
import type { Allowance } from "@/types/allowance";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validateHourlyWage(n: number): string | null {
  if (Number.isNaN(n) || n < 0) {
    return "시급을 올바르게 입력해 주세요.";
  }
  return null;
}

function validatePayday(n: number): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 31) {
    return "월급일은 1~31 사이로 설정해 주세요.";
  }
  return null;
}

const PAY_PERIOD_MODES = {
  CALENDAR_MONTH: "CALENDAR_MONTH",
  ROLLING_BEFORE_PAYDAY: "ROLLING_BEFORE_PAYDAY",
} as const;

function validatePayPeriodMode(
  mode: string
): (typeof PAY_PERIOD_MODES)[keyof typeof PAY_PERIOD_MODES] | null {
  if (
    mode === PAY_PERIOD_MODES.CALENDAR_MONTH ||
    mode === PAY_PERIOD_MODES.ROLLING_BEFORE_PAYDAY
  ) {
    return mode;
  }
  return null;
}

export async function getWorkplaces(): Promise<ActionResult<Workplace[]>> {
  try {
    const userId = await getCurrentUserId();
    const list = await prisma.workplace.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    return { success: true, data: list.map(normalizeWorkplaceForClient) };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export type CreateWorkplaceInput = {
  name: string;
  color: string;
  type: typeof WORKPLACE_TYPE.PARTTIME | typeof WORKPLACE_TYPE.FULLTIME;
  hourlyWage: number;
  isWeeklyAllowanceActive: boolean;
  isTaxActive: boolean;
  paydayOfMonth: number;
  payPeriodMode: string;
  monthlyBaseSalary?: number | null;
  allowances?: Allowance[] | null;
  taxDependents?: number | null;
  hireDate?: string | null;
  annualLeaveTotal?: number | null;
};

export async function createWorkplace(
  data: CreateWorkplaceInput
): Promise<ActionResult<Workplace>> {
  try {
    const userId = await getCurrentUserId();
    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "근무지 이름은 비울 수 없습니다." };
    }
    const color = data.color.trim();
    if (!color) {
      return { success: false, error: "색상 코드는 비울 수 없습니다." };
    }
    const pe = validatePayday(data.paydayOfMonth);
    if (pe) {
      return { success: false, error: pe };
    }
    const mode = validatePayPeriodMode(data.payPeriodMode);
    if (!mode) {
      return { success: false, error: "급여 기간 방식이 올바르지 않습니다." };
    }

    const isFull = data.type === WORKPLACE_TYPE.FULLTIME;

    if (isFull) {
      const monthly = data.monthlyBaseSalary ?? 0;
      if (!Number.isFinite(monthly) || monthly <= 0) {
        return { success: false, error: "월 기본급을 올바르게 입력해 주세요." };
      }
      const td = data.taxDependents ?? 1;
      if (!Number.isInteger(td) || td < 1 || td > 11) {
        return {
          success: false,
          error: "부양가족 수는 1~11 사이로 설정해 주세요.",
        };
      }
      const hw = computeOrdinaryHourlyWage(monthly);
      const allowances = data.allowances ?? [];
      const created = await prisma.workplace.create({
        data: {
          userId,
          name,
          color,
          type: WORKPLACE_TYPE.FULLTIME,
          hourlyWage: hw,
          isWeeklyAllowanceActive: false,
          isTaxActive: false,
          paydayOfMonth: data.paydayOfMonth,
          payPeriodMode: mode,
          monthlyBaseSalary: Math.floor(monthly),
          allowances: allowancesToJsonValue(allowances) as Prisma.InputJsonValue,
          taxDependents: td,
          hireDate: data.hireDate?.trim() || null,
          annualLeaveTotal:
            data.annualLeaveTotal != null && Number.isFinite(data.annualLeaveTotal)
              ? data.annualLeaveTotal
              : null,
        },
      });
      revalidatePath("/work");
      revalidatePath("/settings");
      revalidatePath("/", "page");
      return { success: true, data: normalizeWorkplaceForClient(created) };
    }

    const err = validateHourlyWage(data.hourlyWage);
    if (err) {
      return { success: false, error: err };
    }

    const created = await prisma.workplace.create({
      data: {
        userId,
        name,
        color,
        type: WORKPLACE_TYPE.PARTTIME,
        hourlyWage: data.hourlyWage,
        isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
        isTaxActive: data.isTaxActive,
        paydayOfMonth: data.paydayOfMonth,
        payPeriodMode: mode,
      },
    });
    revalidatePath("/work");
    revalidatePath("/settings");
    revalidatePath("/", "page");
    return { success: true, data: normalizeWorkplaceForClient(created) };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export type UpdateWorkplaceInput = {
  workplaceId: string;
  name: string;
  color: string;
  type: typeof WORKPLACE_TYPE.PARTTIME | typeof WORKPLACE_TYPE.FULLTIME;
  hourlyWage: number;
  isWeeklyAllowanceActive: boolean;
  isTaxActive: boolean;
  isActive: boolean;
  paydayOfMonth: number;
  payPeriodMode: string;
  monthlyBaseSalary?: number | null;
  allowances?: Allowance[] | null;
  taxDependents?: number | null;
  hireDate?: string | null;
  annualLeaveTotal?: number | null;
};

export async function updateWorkplace(
  data: UpdateWorkplaceInput
): Promise<ActionResult<Workplace>> {
  try {
    const userId = await getCurrentUserId();
    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "근무지 이름은 비울 수 없습니다." };
    }
    const color = data.color.trim();
    if (!color) {
      return { success: false, error: "색상 코드는 비울 수 없습니다." };
    }
    const pe = validatePayday(data.paydayOfMonth);
    if (pe) {
      return { success: false, error: pe };
    }
    const mode = validatePayPeriodMode(data.payPeriodMode);
    if (!mode) {
      return { success: false, error: "급여 기간 방식이 올바르지 않습니다." };
    }

    // 소유권 확인
    const existing = await prisma.workplace.findFirst({
      where: { id: data.workplaceId, userId },
    });
    if (!existing) {
      return { success: false, error: "근무지를 찾을 수 없습니다." };
    }

    const isFull = data.type === WORKPLACE_TYPE.FULLTIME;

    if (isFull) {
      const monthly = data.monthlyBaseSalary ?? 0;
      if (data.isActive && (!Number.isFinite(monthly) || monthly <= 0)) {
        return { success: false, error: "월 기본급을 올바르게 입력해 주세요." };
      }
      const td = data.taxDependents ?? 1;
      if (!Number.isInteger(td) || td < 1 || td > 11) {
        return {
          success: false,
          error: "부양가족 수는 1~11 사이로 설정해 주세요.",
        };
      }
      const monthlyInt =
        data.isActive && Number.isFinite(monthly) && monthly > 0
          ? Math.floor(monthly)
          : 0;
      const hw =
        data.isActive && monthlyInt > 0
          ? computeOrdinaryHourlyWage(monthlyInt)
          : 0;
      const allowances = data.allowances ?? [];

      const updated = await prisma.$transaction(async (tx) => {
        const w = await tx.workplace.update({
          where: { id: data.workplaceId },
          data: {
            name,
            color,
            type: WORKPLACE_TYPE.FULLTIME,
            hourlyWage: hw,
            isWeeklyAllowanceActive: false,
            isTaxActive: false,
            isActive: data.isActive,
            paydayOfMonth: data.paydayOfMonth,
            payPeriodMode: mode,
            monthlyBaseSalary: data.isActive ? monthlyInt : null,
            allowances: allowancesToJsonValue(allowances) as Prisma.InputJsonValue,
            taxDependents: td,
            hireDate: data.hireDate?.trim() || null,
            annualLeaveTotal:
              data.annualLeaveTotal != null &&
              Number.isFinite(data.annualLeaveTotal)
                ? data.annualLeaveTotal
                : null,
          },
        });
        if (data.isActive && monthlyInt > 0) {
          await tx.workRecord.updateMany({
            where: { workplaceId: data.workplaceId },
            data: {
              hourlyWage: hw,
              isWeeklyAllowanceActive: false,
              isTaxActive: false,
            },
          });
        }
        return w;
      });

      await syncWorkplaceIncomeBudgetLines(data.workplaceId);

      revalidatePath("/work");
      revalidatePath("/settings");
      revalidatePath("/", "page");
      return { success: true, data: normalizeWorkplaceForClient(updated) };
    }

    const parsed = data.hourlyWage;
    if (
      data.isActive &&
      (Number.isNaN(parsed) || parsed < 0)
    ) {
      return { success: false, error: "시급을 올바르게 입력해 주세요." };
    }
    const wageNum = data.isActive ? parsed : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.workplace.update({
        where: { id: data.workplaceId },
        data: {
          name,
          color,
          type: WORKPLACE_TYPE.PARTTIME,
          hourlyWage: wageNum,
          isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
          isTaxActive: data.isTaxActive,
          isActive: data.isActive,
          paydayOfMonth: data.paydayOfMonth,
          payPeriodMode: mode,
        },
      });
      if (data.isActive) {
        await tx.workRecord.updateMany({
          where: { workplaceId: data.workplaceId },
          data: {
            hourlyWage: wageNum,
            isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
            isTaxActive: data.isTaxActive,
          },
        });
      }
      return w;
    });

    await syncWorkplaceIncomeBudgetLines(data.workplaceId);

    revalidatePath("/work");
    revalidatePath("/settings");
    revalidatePath("/", "page");
    return { success: true, data: normalizeWorkplaceForClient(updated) };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function updateWorkplaceStatus(
  workplaceId: string,
  isActive: boolean
): Promise<ActionResult<Workplace>> {
  try {
    const userId = await getCurrentUserId();
    await prisma.workplace.updateMany({
      where: { id: workplaceId, userId },
      data: { isActive },
    });
    const row = await prisma.workplace.findFirst({ where: { id: workplaceId, userId } });
    if (!row) {
      return { success: false, error: "근무지를 찾을 수 없습니다." };
    }
    revalidatePath("/work");
    revalidatePath("/settings");
    revalidatePath("/", "page");
    return { success: true, data: normalizeWorkplaceForClient(row) };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function deleteWorkplace(
  workplaceId: string
): Promise<ActionResult<void>> {
  try {
    const userId = await getCurrentUserId();
    await prisma.workplace.deleteMany({
      where: { id: workplaceId, userId },
    });
    revalidatePath("/work");
    revalidatePath("/settings");
    revalidatePath("/", "page");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
