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
