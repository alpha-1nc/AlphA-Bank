"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { type AccountType } from "@/lib/asset-constants";

export interface AddAccountData {
  name: string;
  type: AccountType;
  bankName: string;
  accountNumber: string;
  description: string;
}

export async function addAccount(data: AddAccountData) {
  const userId = await getCurrentUserId();
  await prisma.account.create({
    data: {
      userId,
      name: data.name.trim(),
      type: data.type,
      bankName: data.bankName.trim() || null,
      accountNumber: data.accountNumber.trim() || null,
      description: data.description.trim() || null,
    },
  });
  revalidatePath("/asset");
  revalidatePath("/");
}

export async function updateAccount(id: string, data: AddAccountData) {
  const userId = await getCurrentUserId();
  await prisma.account.updateMany({
    where: { id, userId },
    data: {
      name: data.name.trim(),
      type: data.type,
      bankName: data.bankName.trim() || null,
      accountNumber: data.accountNumber.trim() || null,
      description: data.description.trim() || null,
    },
  });
  revalidatePath("/asset");
  revalidatePath("/");
}

export async function deleteAccount(id: string) {
  const userId = await getCurrentUserId();
  await prisma.account.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/asset");
  revalidatePath("/");
}

/**
 * 한 섹션(계좌 종류)의 표시 순서를 저장합니다. 배열 순서가 곧 화면 순서입니다.
 * 하나라도 현재 사용자 소유가 아니거나 중복이면 아무것도 바꾸지 않고 false 를 돌려줍니다.
 */
export async function reorderAccounts(ids: string[]): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (ids.length === 0 || new Set(ids).size !== ids.length) return false;
  const owned = await prisma.account.count({ where: { id: { in: ids }, userId } });
  if (owned !== ids.length) return false;

  await prisma.$transaction(
    ids.map((id, index) => prisma.account.updateMany({ where: { id, userId }, data: { sortOrder: index } })),
  );
  revalidatePath("/asset");
  return true;
}
