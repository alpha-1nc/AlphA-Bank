import { prisma } from "@/lib/prisma";
import { getUserProfile, isValidUserId } from "@/lib/user-profiles";

/**
 * 세션 userId에 대응하는 User 행이 없으면 upsert합니다.
 * 시드 없이 DB를 쓰거나 새 프로필로 접속할 때 MonthlyBudget 등 FK 오류를 막습니다.
 */
export async function ensureUserRowExists(userId: string): Promise<void> {
  if (!isValidUserId(userId)) return;
  const profile = getUserProfile(userId);
  if (!profile) return;
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, name: profile.name },
    update: {},
  });
}
