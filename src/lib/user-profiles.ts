export const VALID_USER_IDS = ["user-jk", "user-my"] as const;

export type ValidUserId = (typeof VALID_USER_IDS)[number];

export const USER_PROFILES = [
  { id: "user-jk" as const, name: "JK", initial: "J" },
  { id: "user-my" as const, name: "MY", initial: "M" },
] as const;

export function isValidUserId(id: string): id is ValidUserId {
  return (VALID_USER_IDS as readonly string[]).includes(id);
}

export function getUserProfile(userId: string) {
  return USER_PROFILES.find((p) => p.id === userId);
}
