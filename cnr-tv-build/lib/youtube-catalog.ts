export type YouTubeClip = {
  id: string;
  title: string;
  artist: string;
  category: string;
  videoType: string;
  durationSeconds: number;
  hlsUrl?: string | null;
};

type ChannelItem = {
  id?: string;
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};
type PlaylistItem = { contentDetails?: { videoId?: string } };
type SearchItem = { id?: { videoId?: string } };
type VideoItem = {
  id?: string;
  snippet?: { title?: string; description?: string; channelTitle?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; madeForKids?: boolean };
  contentDetails?: { duration?: string };
};
type YouTubeResponse<T> = { items?: T[]; nextPageToken?: string; error?: { message?: string; errors?: { reason?: string }[] } };

function parseDuration(value: string): number {
  const match = value.match(/^PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?$/);
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
function videoTypeFor(title: string, description: string): string {
  const value = (title + " " + description).toLocaleLowerCase("tr-TR");
  if (/\\b(lyrics?|lyric video|şarkı sözleri|sözleriyle)\\b/.test(value)) return "Şarkı Sözleri";
  if (/\\b(visuali[sz]er|visualizer)\\b/.test(value)) return "Visualizer";
  if (/\\b(audio|official audio|lyric audio)\\b/.test(value)) return "Audio";
  if (/\\b(official video|official music video|resmî klip|resmi klip|klip)\\b/.test(value)) return "Resmî Klip";
  return "Müzik Videosu";
}

async function youtube<T>(endpoint: string, params: Record<string, string>, apiKey: string): Promise<YouTubeResponse<T>> {
  const url = new URL("https://www.googleapis.com/youtube/v3/" + endpoint);
  url.search = new URLSearchParams({ ...params, key: apiKey }).toString();
  const response = await fetch(url, { next: { revalidate: 900 } });
  const data = await response.json() as YouTubeResponse<T>;
  if (!response.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded") throw new Error("YouTube Data API günlük kotası doldu.");
    throw new Error(data.error?.message || "YouTube kanal kataloğu alınamadı.");
  }
  return data;
}

export async function getYouTubeCatalog(searchQuery?: string): Promise<YouTubeClip[]> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY sunucu ortamında tanımlı değil.");

  // Resolve the artist channel once, then use its uploads playlist as the broadcast source.
  const channelData = await youtube<ChannelItem>("channels", {
    part: "contentDetails", forHandle: "memetcinar444"
  }, apiKey);
  const channel = channelData.items?.[0];
  const channelId = channel?.id;
  const uploadsId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channelId || !uploadsId) throw new Error("@memetcinar444 YouTube kanalı veya yüklemeler listesi bulunamadı.");

  let ids: string[] = [];
  if (searchQuery?.trim()) {
    const searchData = await youtube<SearchItem>("search", {
      part: "snippet", type: "video", channelId, q: searchQuery.trim(),
      videoEmbeddable: "true", videoSyndicated: "true", maxResults: "25", order: "relevance"
    }, apiKey);
    ids = (searchData.items || []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  } else {
    const playlistData = await youtube<PlaylistItem>("playlistItems", {
      part: "contentDetails", playlistId: uploadsId, maxResults: "50"
    }, apiKey);
    ids = (playlistData.items || []).map((item) => item.contentDetails?.videoId).filter((id): id is string => Boolean(id));
  }

  ids = [...new Set(ids)];
  if (!ids.length) return [];

  const detailData = await youtube<VideoItem>("videos", {
    part: "snippet,status,contentDetails", id: ids.join(",")
  }, apiKey);

  const clips = (detailData.items || [])
    .filter((video) => {
      const duration = parseDuration(video.contentDetails?.duration || "");
      const title = video.snippet?.title || "";
      const description = video.snippet?.description || "";
      const markedShort = /#shorts|\\bshorts\\b|short video/i.test(title + " " + description);
      // The Data API does not expose frame orientation. Remove sub-minute uploads and
      // explicitly marked Shorts without discarding ordinary 1–3 minute music videos.
      return Boolean(video.id) && video.status?.privacyStatus === "public" &&
        video.status?.embeddable === true && video.status?.madeForKids !== true &&
        duration > 60 && !markedShort;
    })
    .map((video) => {
      const title = video.snippet?.title?.trim() || "İsimsiz müzik videosu";
      const description = video.snippet?.description || "";
      return {
        id: video.id as string,
        title,
        artist: video.snippet?.channelTitle?.trim() || "MEMET ÇINAR",
        category: categoryFor(title, description),
        videoType: videoTypeFor(title, description),
        durationSeconds: parseDuration(video.contentDetails?.duration || "") || 180
      };
    });
  if (!clips.length && !searchQuery) {
    throw new Error("@memetcinar444 kanalında yayınlanabilir video bulunamadı. Videoların herkese açık ve yerleştirmeye izinli olduğundan emin ol.");
  }
  return clips;
}
