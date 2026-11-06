import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SearchItem = {
  id?: { videoId?: string };
};
type VideoItem = {
  id?: string;
  snippet?: { title?: string; description?: string; channelTitle?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; madeForKids?: boolean };
};
type YouTubeList<T> = { items?: T[]; error?: { message?: string; errors?: { reason?: string }[] } };

function categoryFor(title: string, description: string): string {
  const text = (title + " " + description).toLocaleLowerCase("tr-TR");
  if (/akustik|unplugged|acoustic|live session|canlı performans/.test(text)) return "Akustik";
  if (/rap|trap|hip.?hop|drill|freestyle/.test(text)) return "Rap & Trap";
  if (/slow|efkar|ayrılık|hüzün|duygusal|ballad/.test(text)) return "Efkar";
  if (/dance|dans|remix|club|edm/.test(text)) return "Pop & Dans";
  return "Türkçe Pop";
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY sunucu ortamında tanımlı değil." }, { status: 503 });
  }

  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.search = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoCategoryId: "10",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      regionCode: "TR",
      relevanceLanguage: "tr",
      safeSearch: "moderate",
      maxResults: "50",
      order: "relevance",
      q: "Türkçe müzik klip resmi video"
    }).toString();
    searchUrl.searchParams.set("key", apiKey);

    const searchResponse = await fetch(searchUrl, { next: { revalidate: 21600 } });
    const searchData = await searchResponse.json() as YouTubeList<SearchItem>;
    if (!searchResponse.ok) {
      const reason = searchData.error?.errors?.[0]?.reason;
      const message = reason === "quotaExceeded"
        ? "YouTube Data API günlük kotası doldu."
        : searchData.error?.message || "YouTube video araması başarısız oldu.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const ids = [...new Set((searchData.items || []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id)))];
    if (!ids.length) return NextResponse.json({ error: "YouTube aramasında uygun klip bulunamadı." }, { status: 404 });

    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.search = new URLSearchParams({ part: "snippet,status", id: ids.join(",") }).toString();
    detailsUrl.searchParams.set("key", apiKey);
    const detailsResponse = await fetch(detailsUrl, { next: { revalidate: 21600 } });
    const detailsData = await detailsResponse.json() as YouTubeList<VideoItem>;
    if (!detailsResponse.ok) {
      return NextResponse.json({ error: detailsData.error?.message || "YouTube video ayrıntıları alınamadı." }, { status: 502 });
    }

    const clips = (detailsData.items || [])
      .filter((video) => Boolean(video.id) && video.status?.privacyStatus === "public" && video.status?.embeddable === true && video.status?.madeForKids !== true)
      .map((video) => {
        const title = video.snippet?.title?.trim() || "İsimsiz klip";
        return {
          id: video.id as string,
          title,
          artist: video.snippet?.channelTitle?.trim() || "YouTube sanatçı kanalı",
          category: categoryFor(title, video.snippet?.description || "")
        };
      });

    if (!clips.length) {
      return NextResponse.json({ error: "Arama sonuçlarında herkese açık ve gömülebilir klip bulunamadı." }, { status: 404 });
    }

    const blocks: [string, string, string, string][] = [
      ["ŞİMDİ", "CNR TÜRKÇE POP", "Güncel müzik klipleri", "Türkçe Pop"],
      ["SONRA", "CNR RAP & TRAP", "Yeni nesil ritimler", "Rap & Trap"],
      ["+2", "CNR POP & DANS", "Hareketli müzik kuşağı", "Pop & Dans"],
      ["+3", "EFKAR SAATİ", "Melodik ve duygusal seçki", "Efkar"],
      ["+4", "AKUSTİK SAHNE", "Akustik performanslar", "Akustik"],
      ["+5", "YENİ KLİPLER", "YouTube'dan seçilen klipler", "Türkçe Pop"]
    ];
    const schedule = blocks.map((block, position) => {
      const match = clips.findIndex((clip) => clip.category === block[3]);
      return [block[0], block[1], block[2], match >= 0 ? match : position % clips.length] as [string, string, string, number];
    });

    return NextResponse.json(
      { source: "YouTube Data API v3", clips, schedule },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "YouTube API hizmetine şu anda ulaşılamıyor." }, { status: 502 });
  }
}
