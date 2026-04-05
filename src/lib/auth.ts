import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { type SessionData, sessionOptions } from "@/lib/session";
import { isValidUserId } from "@/lib/user-profiles";

/**
 * 세션에서 userId를 추출합니다.
 * 세션이 없거나 유효하지 않은 userId면 /select-profile로 redirect합니다.
 * fallback userId 사용 금지 — 이 함수를 통하지 않고 userId를 얻는 경로 없음.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  const userId = session.userId;

  if (!userId || !isValidUserId(userId)) {
    redirect("/select-profile");
  }

  return userId;
}
