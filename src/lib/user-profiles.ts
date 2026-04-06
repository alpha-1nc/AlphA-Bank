/** JK 앱 사용자 고정 ID */
export const JK_USER_ID =
  "74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0" as const;

export const VALID_USER_IDS = [JK_USER_ID, "user-my"] as const;

export type ValidUserId = (typeof VALID_USER_IDS)[number];

export const USER_PROFILES = [
  { id: JK_USER_ID, name: "JK", initial: "J" },
  { id: "user-my" as const, name: "MY", initial: "M" },
] as const;

export function isValidUserId(id: string): id is ValidUserId {
  return (VALID_USER_IDS as readonly string[]).includes(id);
}

export function getUserProfile(userId: string) {
  return USER_PROFILES.find((p) => p.id === userId);
}
