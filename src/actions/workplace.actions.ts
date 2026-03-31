"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/actions/action-types";
import type { Workplace } from "@/generated/prisma";
import { normalizeWorkplaceForClient } from "@/lib/workplace-client";
import { syncWorkplaceIncomeBudgetLines } from "@/lib/work-budget-sync";

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
): typeof PAY_PERIOD_MODES[keyof typeof PAY_PERIOD_MODES] | null {
  if (
    mode === PAY_PERIOD_MODES.CALENDAR_MONTH ||
    mode === PAY_PERIOD_MODES.ROLLING_BEFORE_PAYDAY
  ) {
    return mode;
  }
  return null;
}

export async function getWorkplaces(
  userId: string
): Promise<ActionResult<Workplace[]>> {
  try {
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
  userId: string;
  name: string;
  color: string;
  hourlyWage: number;
  isWeeklyAllowanceActive: boolean;
  isTaxActive: boolean;
  paydayOfMonth: number;
  payPeriodMode: string;
};

export async function createWorkplace(
  data: CreateWorkplaceInput
): Promise<ActionResult<Workplace>> {
  try {
    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "근무지 이름은 비울 수 없습니다." };
    }
    const color = data.color.trim();
    if (!color) {
      return { success: false, error: "색상 코드는 비울 수 없습니다." };
    }
    const err = validateHourlyWage(data.hourlyWage);
    if (err) {
      return { success: false, error: err };
    }
    const pe = validatePayday(data.paydayOfMonth);
    if (pe) {
      return { success: false, error: pe };
    }
    const mode = validatePayPeriodMode(data.payPeriodMode);
    if (!mode) {
      return { success: false, error: "급여 기간 방식이 올바르지 않습니다." };
    }

    const created = await prisma.workplace.create({
      data: {
        userId: data.userId,
        name,
        color,
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
  hourlyWage: number;
  isWeeklyAllowanceActive: boolean;
  isTaxActive: boolean;
  isActive: boolean;
  paydayOfMonth: number;
  payPeriodMode: string;
};

export async function updateWorkplace(
  data: UpdateWorkplaceInput
): Promise<ActionResult<Workplace>> {
  try {
    const name = data.name.trim();
    if (!name) {
      return { success: false, error: "근무지 이름은 비울 수 없습니다." };
    }
    const color = data.color.trim();
    if (!color) {
      return { success: false, error: "색상 코드는 비울 수 없습니다." };
    }
    const err = validateHourlyWage(data.hourlyWage);
    if (err) {
      return { success: false, error: err };
    }
    const pe = validatePayday(data.paydayOfMonth);
    if (pe) {
      return { success: false, error: pe };
    }
    const mode = validatePayPeriodMode(data.payPeriodMode);
    if (!mode) {
      return { success: false, error: "급여 기간 방식이 올바르지 않습니다." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.workplace.update({
        where: { id: data.workplaceId },
        data: {
          name,
          color,
          hourlyWage: data.hourlyWage,
          isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
          isTaxActive: data.isTaxActive,
          isActive: data.isActive,
          paydayOfMonth: data.paydayOfMonth,
          payPeriodMode: mode,
        },
      });
      await tx.workRecord.updateMany({
        where: { workplaceId: data.workplaceId },
        data: {
          hourlyWage: data.hourlyWage,
          isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
          isTaxActive: data.isTaxActive,
        },
      });
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
    const updated = await prisma.workplace.update({
      where: { id: workplaceId },
      data: { isActive },
    });
    revalidatePath("/work");
    revalidatePath("/settings");
    revalidatePath("/", "page");
    return { success: true, data: normalizeWorkplaceForClient(updated) };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function deleteWorkplace(
  workplaceId: string
): Promise<ActionResult<void>> {
  try {
    await prisma.workplace.delete({
      where: { id: workplaceId },
    });
    revalidatePath("/work");
    revalidatePath("/settings");
    revalidatePath("/", "page");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
