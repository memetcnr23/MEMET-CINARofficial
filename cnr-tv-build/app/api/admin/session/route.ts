import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const ok = await isAdminSession();
  return NextResponse.json({ authenticated: ok }, { status: ok ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
