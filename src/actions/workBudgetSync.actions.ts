"use server";

import { revalidatePath } from "next/cache";
import { syncAllWorkplacesIncomeBudgetForUser } from "@/lib/work-budget-sync";

/**
 * 알바 화면 마운트 시 한 번 실행 — Server Action 컨텍스트에서만 revalidatePath 호출
 */
export async function runWorkBudgetSyncForUser(userId: string): Promise<void> {
  try {
    await syncAllWorkplacesIncomeBudgetForUser(userId);
    revalidatePath("/budget");
    revalidatePath("/");
    revalidatePath("/work");
  } catch (e) {
    console.error("[runWorkBudgetSyncForUser]", userId, e);
  }
}
