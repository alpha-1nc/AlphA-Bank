import { NextResponse } from "next/server";

// 빌드 시점에 값이 고정되지 않도록 항상 런타임에 평가
export const dynamic = "force-dynamic";

/** VAPID 공개키를 런타임에 내려준다. (공개키라 노출돼도 안전) */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json(
      { configured: false, publicKey: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { configured: true, publicKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
