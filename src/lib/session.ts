import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
}

export const sessionOptions: SessionOptions = {
  cookieName: "alphabank-session",
  password: (process.env.SESSION_PASSWORD ?? process.env.SESSION_SECRET) as string,
  cookieOptions: {
    maxAge: 60 * 60 * 24 * 90, // 90일
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};
