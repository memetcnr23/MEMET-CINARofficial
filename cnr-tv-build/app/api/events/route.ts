import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRestConfig } from "@/lib/supabase-server";

const allowedEvents = new Set(["play", "pause", "ended"]);

export async function POST(request: NextRequest) {
  const config = getSupabaseRestConfig();
  if (!config) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  let body: { videoId?: unknown; eventType?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const videoId = typeof body.videoId === "string" ? body.videoId : "";
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !allowedEvents.has(eventType)) {
    return NextResponse.json({ error: "Invalid playback event." }, { status: 400 });
  }

  try {
    const response = await fetch(`${config.baseUrl}/playback_events`, {
      method: "POST",
      headers: {
        ...config.headers,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ youtube_video_id: videoId, event_type: eventType }),
      cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Supabase service is unavailable." }, { status: 502 });
  }
}
