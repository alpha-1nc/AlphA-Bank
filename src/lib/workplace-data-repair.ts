import { prisma } from "@/lib/prisma";

let repairRan = false;

/**
 * 마이그레이션 이전·수동 DB 조작 등으로 NULL이 남은 행을 스키마 기본값으로 맞춥니다.
 * 멱등이며 SQLite `Workplace` / `WorkRecord` 테이블에만 적용합니다.
 */
export async function repairWorkplaceWorkRecordNulls(): Promise<void> {
  if (repairRan) return;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Workplace" SET "hourlyWage" = 10030 WHERE "hourlyWage" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Workplace" SET "isWeeklyAllowanceActive" = 1 WHERE "isWeeklyAllowanceActive" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Workplace" SET "isTaxActive" = 1 WHERE "isTaxActive" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Workplace" SET "isActive" = 1 WHERE "isActive" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Workplace" SET "paydayOfMonth" = 10 WHERE "paydayOfMonth" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Workplace" SET "payPeriodMode" = 'CALENDAR_MONTH' WHERE "payPeriodMode" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkRecord" SET "hourlyWage" = 10030 WHERE "hourlyWage" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkRecord" SET "isWeeklyAllowanceActive" = 1 WHERE "isWeeklyAllowanceActive" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkRecord" SET "isTaxActive" = 1 WHERE "isTaxActive" IS NULL`
    );
    repairRan = true;
  } catch (e) {
    console.error("[workplace-data-repair]", e);
  }
}
