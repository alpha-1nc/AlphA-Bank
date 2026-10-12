"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export interface AddBucketData {
  title: string;
  importance: number;
  targetAmount: number;
  imageUrl?: string | null;
}

export async function addBucket(data: AddBucketData) {
  const userId = await getCurrentUserId();
  await prisma.bucketList.create({
    data: {
      userId,
      title: data.title.trim(),
      importance: data.importance,
      targetAmount: data.targetAmount,
      imageUrl: data.imageUrl?.trim() || null,
    },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

/** amount > 0 납입, amount < 0 출금. 누적 금액이 0 미만이 되는 요청은 거부한다. */
export async function addBucketFund(id: string, amount: number) {
  if (!Number.isInteger(amount) || amount === 0) throw new Error("금액이 올바르지 않습니다.");

  const userId = await getCurrentUserId();
  const bucket = await prisma.bucketList.findFirst({
    where: { id, userId },
  });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");

  const newAmount = bucket.currentAmount + amount;
  if (newAmount < 0) throw new Error("출금액이 현재 누적 금액을 초과합니다.");
  const isAchieved = newAmount >= bucket.targetAmount;

  // 읽은 시점의 누적 금액이 그대로일 때만 반영 (동시 요청으로 0 미만이 되는 것을 방지)
  const result = await prisma.bucketList.updateMany({
    where: { id, userId, currentAmount: bucket.currentAmount },
    data: { currentAmount: newAmount, isAchieved },
  });
  if (result.count !== 1) throw new Error("금액이 이미 변경되었습니다. 다시 시도해 주세요.");
  revalidatePath("/bucket");
  revalidatePath("/");
}

export async function deleteBucket(id: string) {
  const userId = await getCurrentUserId();
  await prisma.bucketList.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

export interface UpdateBucketData {
  title?: string;
  importance?: number;
  targetAmount?: number;
  currentAmount?: number;
  imageUrl?: string | null;
}

export async function updateBucket(id: string, data: UpdateBucketData) {
  const userId = await getCurrentUserId();
  const existing = await prisma.bucketList.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("목표를 찾을 수 없습니다.");

  const nextTarget =
    data.targetAmount !== undefined ? data.targetAmount : existing.targetAmount;
  const nextCurrent =
    data.currentAmount !== undefined
      ? Math.max(0, data.currentAmount)
      : existing.currentAmount;
  const isAchieved = nextCurrent >= nextTarget;

  await prisma.bucketList.updateMany({
    where: { id, userId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.importance !== undefined && { importance: data.importance }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.currentAmount !== undefined && {
        currentAmount: Math.max(0, data.currentAmount),
      }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl?.trim() || null }),
      isAchieved,
    },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

/** YYYY-MM-DD — 달성일 저장 후 완료 처리 */
export async function completeBucket(id: string, completedAtDate: string) {
  const userId = await getCurrentUserId();
  const bucket = await prisma.bucketList.findFirst({ where: { id, userId } });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(completedAtDate.trim());
  if (!m) throw new Error("날짜 형식이 올바르지 않습니다.");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const completedAt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  if (Number.isNaN(completedAt.getTime())) throw new Error("날짜가 올바르지 않습니다.");

  await prisma.bucketList.updateMany({
    where: { id, userId },
    data: { isCompleted: true, completedAt },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

export async function uncompleteBucket(id: string) {
  const userId = await getCurrentUserId();
  const bucket = await prisma.bucketList.findFirst({ where: { id, userId } });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");
  await prisma.bucketList.updateMany({
    where: { id, userId },
    data: { isCompleted: false, completedAt: null },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}
