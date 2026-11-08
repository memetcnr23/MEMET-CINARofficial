import { NextResponse } from "next/server";
import { getYouTubeCatalog, type YouTubeClip } from "@/lib/youtube-catalog";

export const dynamic = "force-dynamic";

function getHlsClipMap(): Record<string, string> {
  const raw = process.env.CNR_HLS_CLIP_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const safe: Record<string, string> = {};
    for (const [clipId, candidate] of Object.entries(parsed)) {
      if (typeof candidate !== "string") continue;
      const value = candidate.trim();
      if (value.startsWith("/") && !value.startsWith("//") && value.toLowerCase().endsWith(".m3u8")) {
        safe[clipId] = value;
        continue;
      }
      try {
        const url = new URL(value);
        if (url.protocol === "https:" && url.pathname.toLowerCase().endsWith(".m3u8")) safe[clipId] = url.toString();
      } catch {
        // Ignore invalid or non-HTTPS manifest URLs.
      }
    }
    return safe;
  } catch {
    return {};
  }
}

function programFor(category: string) {
  if (category === "Rap & Trap") return "CNR Rap & Trap";
  if (category === "Pop & Dans") return "Pop & Dans";
  if (category === "Akustik") return "Akustik Sahne";
  if (category === "Efkar") return "Efkar Gecesi";
  return "Türkçe Pop Hits";
}

function getTimeline(clips: YouTubeClip[], nowMs: number) {
  const startEpoch = Date.UTC(2026, 10, 7, 0, 0, 0) / 1000;
  const durations = clips.map((clip) => Math.max(60, clip.durationSeconds || 180));
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const elapsed = Math.max(0, nowMs / 1000 - startEpoch);
  let position = elapsed % total;
  let index = 0;
  while (index < durations.length - 1 && position >= durations[index]) {
    position -= durations[index];
    index += 1;
  }
  const nowSeconds = nowMs / 1000;
  let cursor = nowSeconds - position;
  const upcoming: Array<{
    clip: YouTubeClip;
    startsAt: string;
    endsAt: string;
    offsetSeconds: number;
  }> = [];
  let currentOffset = position;
  let pointer = index;
  for (let item = 0; item < Math.min(12, clips.length + 1); item += 1) {
    const clip = clips[pointer];
    const duration = durations[pointer];
    upcoming.push({
      clip,
      startsAt: new Date(cursor * 1000).toISOString(),
      endsAt: new Date((cursor + duration) * 1000).toISOString(),
      offsetSeconds: item === 0 ? currentOffset : 0
    });
    cursor += duration;
    pointer = (pointer + 1) % clips.length;
  }
  return { upcoming, total };
}

export async function GET() {
  try {
    const sourceClips = await getYouTubeCatalog();
    if (sourceClips.length === 0) {
      throw new Error("Yayın kataloğu boş. YouTube API erişimi veya video filtreleri nedeniyle oynatılabilir klip bulunamadı.");
    }
    const hlsMap = getHlsClipMap();
    const clips = sourceClips.map((clip) => ({ ...clip, hlsUrl: hlsMap[clip.id] || null }));
    const hlsConfiguredCount = clips.filter((clip) => Boolean(clip.hlsUrl)).length;
    const now = Date.now();
    const timeline = getTimeline(clips, now);
    return NextResponse.json({
      source: "CNR synchronized HLS-first playlist",
      hls: {
        mode: process.env.NEXT_PUBLIC_CNR_HLS_URL ? "continuous" : "per-clip",
        configuredClips: hlsConfiguredCount,
        totalClips: clips.length,
        fallbackClips: clips.length - hlsConfiguredCount
      },
      serverTime: new Date(now).toISOString(),
      current: timeline.upcoming[0],
      upcoming: timeline.upcoming,
      clips,
      playlistDurationSeconds: timeline.total
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canlı yayın bilgisi alınamadı.";
    return NextResponse.json({ error: message }, { status: message.includes("tanımlı") ? 503 : 502 });
  }
}