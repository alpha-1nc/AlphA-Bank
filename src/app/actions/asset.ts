"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
  await prisma.account.create({
    data: {
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
  await prisma.account.update({
    where: { id },
    data: { initialBalance: amount },
  });
  revalidatePath("/asset");
  revalidatePath("/");
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({
    where: { id },
  });
  revalidatePath("/asset");
  revalidatePath("/");
}
