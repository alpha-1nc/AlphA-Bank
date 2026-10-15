"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export interface SystemSettingsData {
  id: string;
  budgetStartDate: number;
  notifyBudgetStart: boolean;
  notifyUncompleted: boolean;
  notifyPaydayEve: boolean;
  notifyMidCycle: boolean;
  notifyHour: number;
  updatedAt: Date;
}

const DEFAULT_SETTINGS: SystemSettingsData = {
  id: "global",
  budgetStartDate: 1,
  notifyBudgetStart: true,
  notifyUncompleted: true,
  notifyPaydayEve: true,
  notifyMidCycle: true,
  notifyHour: 10,
  updatedAt: new Date(),
};

/** raw SQL 행(SQLite: boolean 은 0/1, 컬럼이 아직 없으면 undefined) → 기본값 보정 */
function fromRawRow(row: Record<string, unknown>): SystemSettingsData {
  const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : Boolean(Number(v)));
  const hour = Number(row.notifyHour);
  return {
    id: String(row.id),
    budgetStartDate: Number(row.budgetStartDate),
    notifyBudgetStart: bool(row.notifyBudgetStart, DEFAULT_SETTINGS.notifyBudgetStart),
    notifyUncompleted: bool(row.notifyUncompleted, DEFAULT_SETTINGS.notifyUncompleted),
    notifyPaydayEve: bool(row.notifyPaydayEve, DEFAULT_SETTINGS.notifyPaydayEve),
    notifyMidCycle: bool(row.notifyMidCycle, DEFAULT_SETTINGS.notifyMidCycle),
    notifyHour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_SETTINGS.notifyHour,
    updatedAt: new Date(String(row.updatedAt)),
  };
}

export async function getSystemSettings(): Promise<SystemSettingsData> {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "global", budgetStartDate: 1 },
      });
    }
    return {
      id: settings.id,
      budgetStartDate: settings.budgetStartDate,
      notifyBudgetStart: settings.notifyBudgetStart,
      notifyUncompleted: settings.notifyUncompleted,
      notifyPaydayEve: settings.notifyPaydayEve,
      notifyMidCycle: settings.notifyMidCycle,
      notifyHour: settings.notifyHour,
      updatedAt: settings.updatedAt,
    };
  } catch {
    // Fallback: raw SQL when prisma.systemSettings is undefined (Next.js bundling)
  }

  // Fallback: raw SQL (SystemSettings table)
  try {
    // SELECT * : notify* 컬럼이 아직 DB 에 없어도(스키마 미적용) 깨지지 않고 기본값으로 보정
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT * FROM "SystemSettings" WHERE "id" = ?',
      "global"
    );
    if (rows && rows.length > 0) {
      return fromRawRow(rows[0]);
    }
    await prisma.$executeRawUnsafe(
      'INSERT OR IGNORE INTO "SystemSettings" ("id", "budgetStartDate", "updatedAt") VALUES (?, ?, ?)',
      "global",
      1,
      new Date().toISOString()
    );
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateBudgetStartDate(day: number) {
  const clamped = Math.max(1, Math.min(31, day));
  try {
    await prisma.systemSettings.upsert({
      where: { id: "global" },
      create: { id: "global", budgetStartDate: clamped },
      update: { budgetStartDate: clamped },
    });
  } catch {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "SystemSettings" ("id", "budgetStartDate", "updatedAt") VALUES (?, ?, ?) ON CONFLICT("id") DO UPDATE SET "budgetStartDate" = excluded."budgetStartDate", "updatedAt" = excluded."updatedAt"',
      "global",
      clamped,
      new Date().toISOString()
    );
  }
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/");
}

export interface ExportCSVResult {
  accountCSV: string;
  cashFlowCSV: string;
  bucketListCSV: string;
}

export async function exportAllDataCSV(): Promise<ExportCSVResult> {
  const userId = await getCurrentUserId();
  const [accounts, cashFlows, bucketList] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.cashFlow.findMany({
      where: { monthlyBudget: { userId } },
      include: { monthlyBudget: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bucketList.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const accountHeaders = "id,name,type,bankName,accountNumber,description,createdAt";
  const accountCSV = [
    accountHeaders,
    ...accounts.map((a) =>
      [
        a.id,
        escapeCSV(a.name),
        escapeCSV(a.type),
        escapeCSV(a.bankName ?? ""),
        escapeCSV(a.accountNumber ?? ""),
        escapeCSV(a.description ?? ""),
        a.createdAt.toISOString(),
      ].join(",")
    ),
  ].join("\n");

  const cashFlowHeaders = "id,type,category,emoji,title,amount,isCompleted,month,createdAt";
  const cashFlowCSV = [
    cashFlowHeaders,
    ...cashFlows.map((c) =>
      [
        c.id,
        escapeCSV(c.type),
        escapeCSV(c.category ?? ""),
        escapeCSV(c.emoji ?? ""),
        escapeCSV(c.title),
        c.amount,
        c.isCompleted,
        escapeCSV(c.monthlyBudget.month),
        c.createdAt.toISOString(),
      ].join(",")
    ),
  ].join("\n");

  const bucketHeaders =
    "id,title,importance,targetAmount,currentAmount,isAchieved,isCompleted,completedAt,imageUrl,createdAt";
  const bucketListCSV = [
    bucketHeaders,
    ...bucketList.map((b) =>
      [
        b.id,
        escapeCSV(b.title),
        b.importance,
        b.targetAmount,
        b.currentAmount,
        b.isAchieved,
        b.isCompleted,
        b.completedAt?.toISOString() ?? "",
        escapeCSV(b.imageUrl ?? ""),
        b.createdAt.toISOString(),
      ].join(",")
    ),
  ].join("\n");

  return { accountCSV, cashFlowCSV, bucketListCSV };
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function factoryReset(confirmText: string) {
  if (confirmText !== "AlphA Inc.") {
    throw new Error("Invalid confirmation text.");
  }

  const userId = await getCurrentUserId();

  await prisma.$transaction(async (tx) => {
    const budgets = await tx.monthlyBudget.findMany({
      where: { userId },
      select: { id: true },
    });
    const budgetIds = budgets.map((b) => b.id);

    await tx.cashFlow.deleteMany({ where: { monthlyBudgetId: { in: budgetIds } } });
    await tx.monthlyBudget.deleteMany({ where: { userId } });
    await tx.bucketList.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
  });

  revalidatePath("/", "layout");
}
