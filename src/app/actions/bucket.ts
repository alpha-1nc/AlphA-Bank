"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface AddBucketData {
  title: string;
  importance: number;
  targetAmount: number;
  imageUrl?: string | null;
}

export async function addBucket(data: AddBucketData) {
  await prisma.bucketList.create({
    data: {
      title: data.title.trim(),
      importance: data.importance,
      targetAmount: data.targetAmount,
      imageUrl: data.imageUrl?.trim() || null,
    },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

export async function addBucketFund(id: string, amount: number) {
  const bucket = await prisma.bucketList.findUnique({
    where: { id },
  });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");

  const newAmount = Math.max(0, bucket.currentAmount + amount);
  const isAchieved = newAmount >= bucket.targetAmount;

  await prisma.bucketList.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      isAchieved,
    },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

export async function deleteBucket(id: string) {
  await prisma.bucketList.delete({
    where: { id },
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
  const existing = await prisma.bucketList.findUnique({ where: { id } });
  if (!existing) throw new Error("목표를 찾을 수 없습니다.");

  const nextTarget =
    data.targetAmount !== undefined ? data.targetAmount : existing.targetAmount;
  const nextCurrent =
    data.currentAmount !== undefined
      ? Math.max(0, data.currentAmount)
      : existing.currentAmount;
  const isAchieved = nextCurrent >= nextTarget;

  await prisma.bucketList.update({
    where: { id },
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
  const bucket = await prisma.bucketList.findUnique({ where: { id } });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(completedAtDate.trim());
  if (!m) throw new Error("날짜 형식이 올바르지 않습니다.");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const completedAt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  if (Number.isNaN(completedAt.getTime())) throw new Error("날짜가 올바르지 않습니다.");

  await prisma.bucketList.update({
    where: { id },
    data: { isCompleted: true, completedAt },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

export async function uncompleteBucket(id: string) {
  const bucket = await prisma.bucketList.findUnique({ where: { id } });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");
  await prisma.bucketList.update({
    where: { id },
    data: { isCompleted: false, completedAt: null },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}
