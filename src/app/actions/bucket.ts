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
  imageUrl?: string | null;
}

export async function updateBucket(id: string, data: UpdateBucketData) {
  await prisma.bucketList.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.importance !== undefined && { importance: data.importance }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl?.trim() || null }),
    },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}

export async function toggleBucketCompleted(id: string) {
  const bucket = await prisma.bucketList.findUnique({ where: { id } });
  if (!bucket) throw new Error("목표를 찾을 수 없습니다.");
  await prisma.bucketList.update({
    where: { id },
    data: { isCompleted: !bucket.isCompleted },
  });
  revalidatePath("/bucket");
  revalidatePath("/");
}
