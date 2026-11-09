import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, createSessionToken, safeEqual } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin && host) {
    try { if (new URL(origin).host !== host) return NextResponse.json({ error: "İstek reddedildi." }, { status: 403 }); }
    catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 403 }); }
  }
  const expected = process.env.CNR_STATS_PASSWORD;
  if (!expected || !process.env.CNR_STATS_SESSION_SECRET) return NextResponse.json({ error: "Güvenlik yapılandırması eksik." }, { status: 503 });
  try {
    const body = await request.json() as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!safeEqual(password, expected)) return NextResponse.json({ error: "Şirket şifresi hatalı." }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createSessionToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
      path: "/", maxAge: ADMIN_COOKIE_MAX_AGE
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.json({ error: "Giriş isteği işlenemedi." }, { status: 400 }); }
}
