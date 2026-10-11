/** JK 앱 사용자 고정 ID */
export const JK_USER_ID =
  "74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0" as const;

export const VALID_USER_IDS = [JK_USER_ID, "user-my"] as const;

export type ValidUserId = (typeof VALID_USER_IDS)[number];

export const USER_PROFILES = [
  /** displayName: 대시보드 인사말("○○님의 10월")에 쓰는 이름 */
  { id: JK_USER_ID, name: "JK", initial: "J", displayName: "중경" },
  { id: "user-my" as const, name: "MY", initial: "M", displayName: "MY" },
] as const;

export function isValidUserId(id: string): id is ValidUserId {
  return (VALID_USER_IDS as readonly string[]).includes(id);
}

export function getUserProfile(userId: string) {
  return USER_PROFILES.find((p) => p.id === userId);
}
