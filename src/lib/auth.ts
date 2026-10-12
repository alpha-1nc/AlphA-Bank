import { JK_USER_ID } from "@/lib/user-profiles";

/**
 * 단일 사용자 앱이므로 항상 JK의 userId를 반환합니다.
 * (세션/프로필 선택 없음 — 호출부 시그니처 유지를 위해 async 로 둠)
 */
export async function getCurrentUserId(): Promise<string> {
  return JK_USER_ID;
}
