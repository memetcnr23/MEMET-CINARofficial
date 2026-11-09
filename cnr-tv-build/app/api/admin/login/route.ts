import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, createSessionToken, safeEqual } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Best-effort per-instance throttle. For distributed enforcement, add an edge/WAF rate limit.
const attempts = new Map<string, { count: number; resetAt: number; blockedUntil: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
function noStore(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin && host) {
    try { if (new URL(origin).host !== host) return noStore({ error: "İstek reddedildi." }, 403); }
    catch { return noStore({ error: "Geçersiz istek." }, 403); }
  }
  const expected = process.env.CNR_STATS_PASSWORD;
  if (!expected || !process.env.CNR_STATS_SESSION_SECRET) return noStore({ error: "Güvenlik yapılandırması eksik." }, 503);
  const key = clientKey(request);
  const now = Date.now();
  let state = attempts.get(key);
  if (!state || now > state.resetAt) state = { count: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 };
  if (state.blockedUntil > now) {
    attempts.set(key, state);
    return noStore({ error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene." }, 429);
  }
  try {
    const body = await request.json() as { password?: unknown };
    const password = typeof body.password === "string" ? body.password.slice(0, 256) : "";
    if (!safeEqual(password, expected)) {
      state.count += 1;
      if (state.count >= MAX_ATTEMPTS) state.blockedUntil = now + WINDOW_MS;
      attempts.set(key, state);
      return noStore({ error: state.blockedUntil ? "Çok fazla hatalı deneme. 15 dakika bekle." : "Şirket şifresi hatalı." }, state.blockedUntil ? 429 : 401);
    }
    attempts.delete(key);
    const response = noStore({ ok: true }, 200);
    response.cookies.set(ADMIN_COOKIE, createSessionToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
      path: "/", maxAge: ADMIN_COOKIE_MAX_AGE
    });
    return response;
  } catch { return noStore({ error: "Giriş isteği işlenemedi." }, 400); }
}
