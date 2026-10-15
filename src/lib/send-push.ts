import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export type SendPushResult =
  | { ok: true; sent: number; failed: number; removed: number }
  | { ok: false; reason: "not-configured" | "no-subscriptions" };

const MAX_FAILURES = 5;

/** 한 사용자의 모든 구독에 발송. 만료(404/410)·연속 실패(5회 초과) 구독은 삭제한다. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendPushResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return { ok: false, reason: "not-configured" };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { ok: false, reason: "no-subscriptions" };

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const body = JSON.stringify(payload);

  let sent = 0;
  let failed = 0;
  const remove: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 12 },
        );
        sent++;
        await prisma.pushSubscription
          .update({ where: { id: sub.id }, data: { lastSuccessAt: new Date(), failureCount: 0 } })
          .catch(() => undefined);
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410 || sub.failureCount + 1 > MAX_FAILURES) {
          remove.push(sub.id);
        } else {
          await prisma.pushSubscription
            .update({ where: { id: sub.id }, data: { failureCount: { increment: 1 } } })
            .catch(() => undefined);
        }
      }
    }),
  );
  if (remove.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: remove } } });
  }
  return { ok: true, sent, failed, removed: remove.length };
}
