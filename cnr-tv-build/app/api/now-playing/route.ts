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

function dailyShuffle<T>(items: T[], nowMs: number): T[] {
  const date = new Date(nowMs);
  const seedText = date.getUTCFullYear() + "-" + date.getUTCMonth() + "-" + date.getUTCDate();
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function getTimeline(clips: YouTubeClip[], nowMs: number) {
  const startEpoch = Date.UTC(
    new Date(nowMs).getUTCFullYear(),
    new Date(nowMs).getUTCMonth(),
    new Date(nowMs).getUTCDate()
  ) / 1000;
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
    // Same shuffled order for every viewer during the day; a new random order
    // starts the next day, and every catalog item is played before the loop.
    const shuffledClips = dailyShuffle(clips, now);
    const timeline = getTimeline(shuffledClips, now);
    return NextResponse.json({
      source: "CNR synchronized HLS-first playlist",
      hls: {
        mode: process.env.NEXT_PUBLIC_CNR_HLS_URL ? "continuous" : "per-clip",
        configuredClips: hlsConfiguredCount,
        totalClips: shuffledClips.length,
        fallbackClips: shuffledClips.length - hlsConfiguredCount
      },
      serverTime: new Date(now).toISOString(),
      current: timeline.upcoming[0],
      upcoming: timeline.upcoming,
      clips: shuffledClips,
      playlistDurationSeconds: timeline.total
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const quotaLimited = /quotaExceeded|dailyLimitExceeded|Search Queries per day|günlük kotası doldu/i.test(detail);
    const message = quotaLimited
      ? "YouTube katalog kotası geçici olarak doldu. Son kayıtlı klip listesi kullanılacak; katalog kota yenilendiğinde tekrar güncellenecek."
      : detail.includes("tanımlı")
        ? "Yayın kataloğu sunucu ayarı eksik."
        : "Yayın kataloğu şu anda yenilenemiyor. Lütfen daha sonra tekrar deneyin.";
    return NextResponse.json({ error: message, code: quotaLimited ? "YOUTUBE_QUOTA_LIMIT" : "CATALOG_UNAVAILABLE" }, {
      status: detail.includes("tanımlı") ? 503 : quotaLimited ? 503 : 502,
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  }
}