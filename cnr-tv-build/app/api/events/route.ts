import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const allowedEvents = new Set(["play", "pause", "ended"]);

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  let body: { videoId?: unknown; eventType?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const videoId = typeof body.videoId === "string" ? body.videoId : "";
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !allowedEvents.has(eventType)) {
    return NextResponse.json({ error: "Invalid playback event." }, { status: 400 });
  }

  const { error } = await supabase.from("playback_events").insert({
    youtube_video_id: videoId,
    event_type: eventType
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
