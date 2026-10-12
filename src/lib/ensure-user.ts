import { prisma } from "@/lib/prisma";
import { JK_USER_ID } from "@/lib/user-profiles";

/**
 * 사용자 행이 없으면 upsert합니다.
 * 시드 없이 DB를 쓸 때 MonthlyBudget 등 FK 오류를 막습니다.
 */
export async function ensureUserRowExists(userId: string): Promise<void> {
  if (userId !== JK_USER_ID) return;
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, name: "JK" },
    update: {},
  });
}
