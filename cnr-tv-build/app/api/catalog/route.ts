import { NextResponse } from "next/server";
import { getSupabaseRestConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSupabaseRestConfig();
  if (!config) {
    return NextResponse.json({ configured: false, error: "Supabase environment is missing." }, { status: 503 });
  }

  try {
    const headers = config.headers;
    const [clipsResponse, scheduleResponse] = await Promise.all([
      fetch(`${config.baseUrl}/tv_clips?select=youtube_video_id,title,artist,category,position&is_active=eq.true&order=position.asc`, { headers, cache: "no-store" }),
      fetch(`${config.baseUrl}/broadcast_schedule?select=youtube_video_id,starts_at,title,description,sort_order&order=sort_order.asc`, { headers, cache: "no-store" })
    ]);

    if (!clipsResponse.ok || !scheduleResponse.ok) {
      const detail = !clipsResponse.ok ? await clipsResponse.text() : await scheduleResponse.text();
      return NextResponse.json({ configured: true, error: detail || "Supabase query failed." }, { status: 502 });
    }

    const clips = await clipsResponse.json() as Array<{
      youtube_video_id: string; title: string; artist: string; category: string; position: number;
    }>;
    const schedule = await scheduleResponse.json() as Array<{
      youtube_video_id: string; starts_at: string; title: string; description: string; sort_order: number;
    }>;

    const mappedClips = clips.map((clip) => ({
      id: clip.youtube_video_id,
      title: clip.title,
      artist: clip.artist,
      category: clip.category
    }));
    const indexByVideoId = new Map(mappedClips.map((clip, index) => [clip.id, index]));
    const mappedSchedule = schedule.flatMap((item) => {
      const index = indexByVideoId.get(item.youtube_video_id);
      if (index === undefined) return [];
      return [[String(item.starts_at).slice(0, 5), item.title, item.description || "", index] as [string, string, string, number]];
    });

    return NextResponse.json({ configured: true, clips: mappedClips, schedule: mappedSchedule });
  } catch {
    return NextResponse.json({ configured: true, error: "Supabase service is unavailable." }, { status: 502 });
  }
}
