"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/actions/action-types";
import {
  getKstMonthRangeUtc,
  normalizeKstCalendarDateUtc,
} from "@/lib/kst-month-range";
import type { WorkRecord } from "@/generated/prisma";
import { syncWorkplaceIncomeBudgetLines } from "@/lib/work-budget-sync";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Prisma `WorkRecord` 스칼라만 — 생성 시 id·타임스탬프 제외 */
export type CreateWorkRecordInput = Omit<
  WorkRecord,
  "id" | "createdAt" | "updatedAt"
>;

export async function getWorkRecordsByMonth(
  workplaceId: string,
  year: number,
  month: number
): Promise<ActionResult<WorkRecord[]>> {
  try {
    const { startInclusive, endInclusive } = getKstMonthRangeUtc(year, month);

    const rows = await prisma.workRecord.findMany({
      where: {
        workplaceId,
        date: {
          gte: startInclusive,
          lte: endInclusive,
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

/** 주차·기간 계산용: 클라이언트가 계산한 UTC 구간(월 경계 포함 주) 조회 */
export async function getWorkRecordsByDateRange(
  workplaceId: string,
  startInclusive: Date,
  endInclusive: Date
): Promise<ActionResult<WorkRecord[]>> {
  try {
    const rows = await prisma.workRecord.findMany({
      where: {
        workplaceId,
        date: {
          gte: startInclusive,
          lte: endInclusive,
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

const BATCH_MAX = 62;

export async function createWorkRecordsBatch(
  records: CreateWorkRecordInput[]
): Promise<ActionResult<{ count: number }>> {
  if (records.length === 0) {
    return { success: false, error: "등록할 근무가 없습니다." };
  }
  if (records.length > BATCH_MAX) {
    return {
      success: false,
      error: `한 번에 최대 ${BATCH_MAX}건까지 등록할 수 있습니다.`,
    };
  }
  const workplaceId = records[0].workplaceId;
  if (records.some((r) => r.workplaceId !== workplaceId)) {
    return { success: false, error: "근무지가 일치하지 않습니다." };
  }
  try {
    await prisma.workRecord.createMany({
      data: records.map((data) => ({
        workplaceId: data.workplaceId,
        date: normalizeKstCalendarDateUtc(new Date(data.date)),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        breakTimeMinutes: data.breakTimeMinutes,
        hourlyWage: data.hourlyWage,
        isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
        isTaxActive: data.isTaxActive,
      })),
    });
    await syncWorkplaceIncomeBudgetLines(workplaceId);
    revalidatePath("/work");
    revalidatePath("/", "page");
    return { success: true, data: { count: records.length } };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function createWorkRecord(
  data: CreateWorkRecordInput
): Promise<ActionResult<WorkRecord>> {
  try {
    const dateNorm = normalizeKstCalendarDateUtc(new Date(data.date));
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    const created = await prisma.workRecord.create({
      data: {
        workplaceId: data.workplaceId,
        date: dateNorm,
        startTime,
        endTime,
        breakTimeMinutes: data.breakTimeMinutes,
        hourlyWage: data.hourlyWage,
        isWeeklyAllowanceActive: data.isWeeklyAllowanceActive,
        isTaxActive: data.isTaxActive,
      },
    });
    await syncWorkplaceIncomeBudgetLines(data.workplaceId);
    revalidatePath("/work");
    revalidatePath("/", "page");
    return { success: true, data: created };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function updateWorkRecord(
  id: string,
  data: Partial<WorkRecord>
): Promise<ActionResult<WorkRecord>> {
  try {
    const before = await prisma.workRecord.findUnique({ where: { id } });
    if (!before) {
      return { success: false, error: "근무 기록을 찾을 수 없습니다." };
    }

    const {
      id: _ignoredId,
      createdAt: _c,
      updatedAt: _u,
      ...rest
    } = data;

    const payload: Partial<Omit<WorkRecord, "id" | "createdAt" | "updatedAt">> =
      { ...rest };

    if (rest.date !== undefined) {
      payload.date = normalizeKstCalendarDateUtc(new Date(rest.date));
    }
    if (rest.startTime !== undefined) {
      payload.startTime = new Date(rest.startTime);
    }
    if (rest.endTime !== undefined) {
      payload.endTime = new Date(rest.endTime);
    }

    const updated = await prisma.workRecord.update({
      where: { id },
      data: payload,
    });
    await syncWorkplaceIncomeBudgetLines(updated.workplaceId);
    if (before.workplaceId !== updated.workplaceId) {
      await syncWorkplaceIncomeBudgetLines(before.workplaceId);
    }
    revalidatePath("/work");
    revalidatePath("/", "page");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function deleteWorkRecord(
  id: string
): Promise<ActionResult<void>> {
  try {
    const row = await prisma.workRecord.findUnique({ where: { id } });
    await prisma.workRecord.delete({
      where: { id },
    });
    if (row) {
      await syncWorkplaceIncomeBudgetLines(row.workplaceId);
    }
    revalidatePath("/work");
    revalidatePath("/", "page");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
