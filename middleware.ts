import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { type SessionData, sessionOptions } from "@/lib/session";
import { isValidUserId } from "@/lib/user-profiles";

const PUBLIC_API_PREFIX = "/api/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일 제외
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 프로필 선택: 이미 유효 세션이면 홈으로
  if (pathname === "/select-profile" || pathname.startsWith("/select-profile/")) {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    if (session.userId && isValidUserId(session.userId)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // 세션 생성/해제 API는 비로그인에서도 허용
  if (pathname.startsWith(PUBLIC_API_PREFIX)) {
    return NextResponse.next();
  }

  // 그 외 경로: 세션 필수
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.userId || !isValidUserId(session.userId)) {
    return NextResponse.redirect(new URL("/select-profile", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
