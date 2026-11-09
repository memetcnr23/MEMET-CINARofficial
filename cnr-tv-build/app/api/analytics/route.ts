import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function POST(request: Request) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Origin rejected" }, { status: 403 });
    } catch { return NextResponse.json({ error: "Invalid origin" }, { status: 403 }); }
  }

  const supabase = config();
  if (!supabase) return NextResponse.json({ error: "Analytics database is not configured" }, { status: 503 });

  try {
    const body = await request.json() as { path?: unknown; sessionId?: unknown };
    const path = typeof body.path === "string" ? body.path : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!path.startsWith("/") || path.length > 300 || !/^\\/[a-zA-Z0-9/_?&=.%~-]*$/.test(path) || !UUID.test(sessionId)) {
      return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
    }
    const response = await fetch(`${supabase.url}/rest/v1/rpc/cnr_record_page_view`, {
      method: "POST",
      headers: headers(supabase.key),
      body: JSON.stringify({ p_path: path, p_session_id: sessionId }),
      cache: "no-store"
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("CNR analytics insert failed", response.status, detail.slice(0, 300));
      return NextResponse.json({ error: "Analytics event could not be saved" }, { status: 502 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid analytics request" }, { status: 400 });
  }
}

export async function GET() {
  const supabase = config();
  if (!supabase) return NextResponse.json({ error: "Analytics database is not configured" }, { status: 503 });
  try {
    const response = await fetch(`${supabase.url}/rest/v1/rpc/cnr_analytics_summary`, {
      method: "POST",
      headers: headers(supabase.key),
      body: "{}",
      cache: "no-store"
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("CNR analytics summary failed", response.status, detail.slice(0, 300));
      return NextResponse.json({ error: "Analytics summary is unavailable" }, { status: 502 });
    }
    const summary = await response.json();
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Analytics summary is unavailable" }, { status: 502 });
  }
}
