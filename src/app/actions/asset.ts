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
  initialBalance: number;
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
      initialBalance: data.initialBalance,
    },
  });
  revalidatePath("/asset");
  revalidatePath("/");
}

export async function updateAccountBalance(id: string, amount: number) {
  const userId = await getCurrentUserId();
  await prisma.account.updateMany({
    where: { id, userId },
    data: { initialBalance: amount },
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
