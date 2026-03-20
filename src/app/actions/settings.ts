"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface SystemSettingsData {
  id: string;
  budgetStartDate: number;
  updatedAt: Date;
}

const DEFAULT_SETTINGS: SystemSettingsData = {
  id: "global",
  budgetStartDate: 1,
  updatedAt: new Date(),
};

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
      updatedAt: settings.updatedAt,
    };
  } catch {
    // Fallback: raw SQL when prisma.systemSettings is undefined (Next.js bundling)
  }

  // Fallback: raw SQL (SystemSettings table)
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; budgetStartDate: number; updatedAt: string }>>(
      'SELECT "id", "budgetStartDate", "updatedAt" FROM "SystemSettings" WHERE "id" = ?',
      "global"
    );
    if (rows && rows.length > 0) {
      return {
        id: rows[0].id,
        budgetStartDate: rows[0].budgetStartDate,
        updatedAt: new Date(rows[0].updatedAt),
      };
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
  const [accounts, cashFlows, bucketList] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.cashFlow.findMany({
      include: { monthlyBudget: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bucketList.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const accountHeaders = "id,name,type,bankName,accountNumber,description,initialBalance,createdAt";
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
        a.initialBalance,
        a.createdAt.toISOString(),
      ].join(",")
    ),
  ].join("\n");

  const cashFlowHeaders = "id,type,title,amount,isCompleted,month,accountId,createdAt";
  const cashFlowCSV = [
    cashFlowHeaders,
    ...cashFlows.map((c) =>
      [
        c.id,
        escapeCSV(c.type),
        escapeCSV(c.title),
        c.amount,
        c.isCompleted,
        escapeCSV(c.monthlyBudget.month),
        c.accountId ?? "",
        c.createdAt.toISOString(),
      ].join(",")
    ),
  ].join("\n");

  const bucketHeaders = "id,title,importance,targetAmount,currentAmount,isAchieved,isCompleted,imageUrl,createdAt";
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

  await prisma.$transaction([
    prisma.cashFlow.deleteMany(),
    prisma.monthlyBudget.deleteMany(),
    prisma.bucketList.deleteMany(),
    prisma.account.deleteMany(),
  ]);

  revalidatePath("/", "layout");
}
