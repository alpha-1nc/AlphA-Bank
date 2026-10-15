"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { sendPushToUser, type SendPushResult } from "@/lib/send-push";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushActionResult = { ok: true } | { ok: false; error: string };

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

export async function savePushSubscription(
  subscription: PushSubscriptionInput,
  userAgent?: string | null,
): Promise<PushActionResult> {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!isHttpsUrl(endpoint)) return { ok: false, error: "잘못된 구독 주소예요." };
  if (!isNonEmpty(p256dh) || !isNonEmpty(auth)) return { ok: false, error: "구독 키가 올바르지 않아요." };

  const userId = await getCurrentUserId();
  const ua = userAgent ? userAgent.slice(0, 512) : null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth, userAgent: ua },
    update: { userId, p256dh, auth, userAgent: ua, failureCount: 0 },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  if (!isHttpsUrl(endpoint)) return { ok: false, error: "잘못된 구독 주소예요." };
  const userId = await getCurrentUserId();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return { ok: true };
}

export interface NotificationSettingsInput {
  notifyBudgetStart?: boolean;
  notifyUncompleted?: boolean;
  notifyPaydayEve?: boolean;
  notifyMidCycle?: boolean;
  notifyHour?: number;
}

const BOOL_KEYS = ["notifyBudgetStart", "notifyUncompleted", "notifyPaydayEve", "notifyMidCycle"] as const;

export async function updateNotificationSettings(partial: NotificationSettingsInput): Promise<PushActionResult> {
  const data: Record<string, boolean | number> = {};
  for (const key of BOOL_KEYS) {
    const v = partial?.[key];
    if (v === undefined) continue;
    if (typeof v !== "boolean") return { ok: false, error: "잘못된 설정 값이에요." };
    data[key] = v;
  }
  if (partial?.notifyHour !== undefined) {
    const h = partial.notifyHour;
    if (!Number.isInteger(h) || h < 0 || h > 23) return { ok: false, error: "알림 시각은 0~23시만 가능해요." };
    data.notifyHour = h;
  }
  if (Object.keys(data).length === 0) return { ok: true };

  try {
    await prisma.systemSettings.upsert({
      where: { id: "global" },
      create: { id: "global", ...data },
      update: data,
    });
  } catch {
    // Next.js 번들링 등으로 prisma.systemSettings 를 못 쓸 때 raw SQL 폴백 (키는 위에서 화이트리스트 검증됨)
    try {
      const keys = Object.keys(data);
      const now = new Date().toISOString();
      await prisma.$executeRawUnsafe('INSERT OR IGNORE INTO "SystemSettings" ("id", "updatedAt") VALUES (?, ?)', "global", now);
      await prisma.$executeRawUnsafe(
        `UPDATE "SystemSettings" SET ${keys.map((k) => `"${k}" = ?`).join(", ")}, "updatedAt" = ? WHERE "id" = ?`,
        ...keys.map((k) => (typeof data[k] === "boolean" ? (data[k] ? 1 : 0) : data[k])),
        now,
        "global",
      );
    } catch {
      return { ok: false, error: "저장하지 못했어요." };
    }
  }
  revalidatePath("/settings");
  return { ok: true };
}

export type SendTestResult = SendPushResult;

export async function sendTestNotification(): Promise<SendTestResult> {
  const userId = await getCurrentUserId();
  return sendPushToUser(userId, {
    title: "테스트 알림",
    body: "알림이 정상적으로 도착했어요",
    url: "/",
    tag: "test",
  });
}
