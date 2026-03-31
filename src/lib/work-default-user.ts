import { prisma } from "@/lib/prisma";
import { repairWorkplaceWorkRecordNulls } from "@/lib/workplace-data-repair";

/** 인증 없이 단일 사용자로 근무 데이터를 쓸 때 사용 (첫 방문 시 자동 생성) */
export async function ensureDefaultWorkUserId(): Promise<string> {
  const existing = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    await repairWorkplaceWorkRecordNulls();
    return existing.id;
  }
  const created = await prisma.user.create({ data: {} });
  await repairWorkplaceWorkRecordNulls();
  return created.id;
}
