import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { type SessionData, sessionOptions } from "@/lib/session";
import { isValidUserId } from "@/lib/user-profiles";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { userId } = body as { userId?: string };

  if (!userId || !isValidUserId(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  session.userId = userId;
  await session.save();

  return response;
}
