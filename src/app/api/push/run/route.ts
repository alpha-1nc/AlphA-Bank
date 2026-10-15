import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getSystemSettings } from "@/app/actions/settings";
import { getKstNow } from "@/lib/kst-now";
import { getCurrentBudgetMonthKst, getDueNotifications } from "@/lib/notification-rules";
import { sendPushToUser } from "@/lib/send-push";

export const dynamic = "force-dynamic";

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** cron 이 매시 호출. 현재 KST 시가 notifyHour 와 같을 때만 판정·발송한다. ?force=1 이면 시각 검사 생략. */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET 환경변수 설정이 필요해요." }, { status: 503 });
  }
  if (!secretMatches(req.headers.get("x-cron-secret"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = new Date();
  const kst = getKstNow(now);
  const settings = await getSystemSettings();

  if (!force && kst.hour !== settings.notifyHour) {
    return NextResponse.json({ skipped: true, reason: "hour-mismatch", kstHour: kst.hour, notifyHour: settings.notifyHour });
  }

  const userId = await getCurrentUserId();
  const month = getCurrentBudgetMonthKst(settings.budgetStartDate, now);
  const [currentItems, workplaces] = await Promise.all([
    prisma.cashFlow.findMany({
      where: { monthlyBudget: { userId, month } },
      select: { type: true, isCompleted: true },
    }),
    prisma.workplace.findMany({
      where: { userId },
      select: { name: true, isActive: true, paydayOfMonth: true },
    }),
  ]);

  const due = getDueNotifications({
    now,
    settings,
    budgetStartDate: settings.budgetStartDate,
    currentItems,
    workplaces,
  });

  const results: Array<Record<string, unknown>> = [];
  for (const n of due) {
    // 발송 직전에 로그를 먼저 만든다. 유니크 위반이면 오늘 이미 보낸 것.
    try {
      await prisma.notificationLog.create({ data: { type: n.type, sentOn: kst.key } });
    } catch (e) {
      const exists = await prisma.notificationLog.findUnique({
        where: { type_sentOn: { type: n.type, sentOn: kst.key } },
      });
      if (exists) {
        results.push({ type: n.type, status: "already-sent" });
        continue;
      }
      throw e;
    }
    const r = await sendPushToUser(userId, { title: n.title, body: n.body, url: n.url, tag: n.tag });
    if (!r.ok || r.sent === 0) {
      // 아무 기기에도 못 보냈으면 기록을 지워 재시도(force 등)할 수 있게 한다.
      await prisma.notificationLog.deleteMany({ where: { type: n.type, sentOn: kst.key } });
    }
    results.push(r.ok ? { type: n.type, status: "sent", ...r } : { type: n.type, status: r.reason });
  }

  return NextResponse.json({ skipped: false, forced: force, date: kst.key, hour: kst.hour, due: due.map((d) => d.type), results });
}
