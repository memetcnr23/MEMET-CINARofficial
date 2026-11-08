export type YouTubeClip = {
  id: string;
  title: string;
  artist: string;
  category: string;
  durationSeconds: number;
  hlsUrl?: string | null;
};

type SearchItem = { id?: { videoId?: string } };
type VideoItem = {
  id?: string;
  snippet?: { title?: string; description?: string; channelTitle?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; madeForKids?: boolean };
  contentDetails?: { duration?: string };
};
type YouTubeResponse<T> = { items?: T[]; error?: { message?: string; errors?: { reason?: string }[] } };

function parseDuration(value: string): number {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}
function categoryFor(title: string, description: string): string {
  const value = (title + " " + description).toLocaleLowerCase("tr-TR");
  if (/akustik|unplugged|acoustic|live session|canlı performans/.test(value)) return "Akustik";
  if (/rap|trap|hip.?hop|drill|freestyle/.test(value)) return "Rap & Trap";
  if (/slow|efkar|ayrılık|hüzün|duygusal|ballad/.test(value)) return "Efkar";
  if (/dance|dans|remix|club|edm/.test(value)) return "Pop & Dans";
  return "Türkçe Pop";
}

export async function getYouTubeCatalog(searchQuery?: string): Promise<YouTubeClip[]> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY sunucu ortamında tanımlı değil.");
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({
    part: "snippet", type: "video", videoCategoryId: "10",
    videoEmbeddable: "true", videoSyndicated: "true", regionCode: "TR",
    relevanceLanguage: "tr", safeSearch: "moderate", maxResults: searchQuery ? "25" : "50",
    order: "relevance", q: searchQuery ? (searchQuery.trim() + " resmi müzik klibi") : "Türkçe müzik klip resmi video"
  }).toString();
  searchUrl.searchParams.set("key", apiKey);
  const searchResponse = await fetch(searchUrl, { next: { revalidate: 21600 } });
  const searchData = await searchResponse.json() as YouTubeResponse<SearchItem>;
  if (!searchResponse.ok) {
    const reason = searchData.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded") throw new Error("YouTube Data API günlük kotası doldu.");
    throw new Error(searchData.error?.message || "YouTube video araması başarısız oldu.");
  }
  const ids = [...new Set((searchData.items || []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id)))];
  if (!ids.length) throw new Error("YouTube aramasında uygun klip bulunamadı.");

  const detailUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailUrl.search = new URLSearchParams({ part: "snippet,status,contentDetails", id: ids.join(",") }).toString();
  detailUrl.searchParams.set("key", apiKey);
  const detailResponse = await fetch(detailUrl, { next: { revalidate: 21600 } });
  const detailData = await detailResponse.json() as YouTubeResponse<VideoItem>;
  if (!detailResponse.ok) throw new Error(detailData.error?.message || "YouTube video ayrıntıları alınamadı.");

  const clips = (detailData.items || [])
    .filter((video) => {
      const duration = parseDuration(video.contentDetails?.duration || "");
      return Boolean(video.id) && video.status?.privacyStatus === "public" &&
        video.status?.embeddable === true && video.status?.madeForKids !== true &&
        duration >= 60 && duration <= 900;
    })
    .map((video) => {
      const title = video.snippet?.title?.trim() || "İsimsiz klip";
      return {
        id: video.id as string,
        title,
        artist: video.snippet?.channelTitle?.trim() || "YouTube sanatçı kanalı",
        category: categoryFor(title, video.snippet?.description || ""),
        durationSeconds: parseDuration(video.contentDetails?.duration || "") || 180
      };
    });
  if (!clips.length) throw new Error("Herkese açık, gömülebilir ve uygun uzunlukta müzik klibi bulunamadı.");
  return clips;
}