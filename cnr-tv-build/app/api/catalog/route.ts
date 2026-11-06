import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ configured: false, error: "Supabase environment is missing." }, { status: 503 });
  }

  const [{ data: clips, error: clipsError }, { data: schedule, error: scheduleError }] = await Promise.all([
    supabase.from("tv_clips").select("youtube_video_id,title,artist,category,position").eq("is_active", true).order("position", { ascending: true }),
    supabase.from("broadcast_schedule").select("youtube_video_id,starts_at,title,description,sort_order").order("sort_order", { ascending: true })
  ]);

  if (clipsError || scheduleError) {
    return NextResponse.json({ configured: true, error: clipsError?.message || scheduleError?.message }, { status: 500 });
  }

  const mappedClips = (clips || []).map((clip) => ({
    id: clip.youtube_video_id,
    title: clip.title,
    artist: clip.artist,
    category: clip.category
  }));
  const indexByVideoId = new Map(mappedClips.map((clip, index) => [clip.id, index]));
  const mappedSchedule = (schedule || []).flatMap((item) => {
    const index = indexByVideoId.get(item.youtube_video_id);
    if (index === undefined) return [];
    const time = String(item.starts_at).slice(0, 5);
    return [[time, item.title, item.description || "", index] as [string, string, string, number]];
  });

  return NextResponse.json({ configured: true, clips: mappedClips, schedule: mappedSchedule });
}
