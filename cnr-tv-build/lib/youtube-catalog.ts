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
  snippet?: { title?: string; description?: string; channelTitle?: string; thumbnails?: Record<string, { width?: number; height?: number }> };
  status?: { embeddable?: boolean; privacyStatus?: string; madeForKids?: boolean };
  contentDetails?: { duration?: string };
};
type YouTubeResponse<T> = { items?: T[]; nextPageToken?: string; error?: { message?: string; errors?: { reason?: string }[] } };

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
function videoTypeFor(title: string, description: string): string {
  const value = (title + " " + description).toLocaleLowerCase("tr-TR");
  if (/\b(lyrics?|lyric video|şarkı sözleri|sözleriyle)\b/.test(value)) return "Şarkı Sözleri";
  if (/\b(visuali[sz]er|visualizer)\b/.test(value)) return "Visualizer";
  if (/\b(audio|official audio|lyric audio)\b/.test(value)) return "Audio";
  if (/\b(official video|official music video|resmî klip|resmi klip|klip)\b/.test(value)) return "Resmî Klip";
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

  // The artist's own uploads are one source, not the whole TV channel.
  // If channel lookup fails, global music discovery must still continue.
  let ownUploadIds: string[] = [];
  if (!searchQuery?.trim()) {
    try {
      const channelData = await youtube<ChannelItem>("channels", {
        part: "contentDetails", forHandle: "memetcinar444"
      }, apiKey);
      const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (uploadsId) {
        const playlistData = await youtube<PlaylistItem>("playlistItems", {
          part: "contentDetails", playlistId: uploadsId, maxResults: "50"
        }, apiKey);
        ownUploadIds = (playlistData.items || [])
          .map((item) => item.contentDetails?.videoId)
          .filter((id): id is string => Boolean(id));
      }
    } catch {
      // Continue with the multi-artist YouTube discovery source.
    }
  }

  // Build a real multi-artist channel feed: several genres and every major
  // music-video format are discovered independently, then fairly mixed.
  const discoveryQueries = searchQuery?.trim()
    ? [searchQuery.trim()]
    : [
        "Türkçe pop resmi klip",
        "Türkçe rap official music video",
        "Türkçe rock official music video",
        "Türkçe arabesk müzik klip",
        "Türkçe şarkı sözleri lyric video",
        "Türkçe official audio visualizer",
        "Turkish music official music video"
      ];
  const discovered = await Promise.all(discoveryQueries.map((query) =>
    youtube<SearchItem>("search", {
      part: "snippet", type: "video", q: query,
      videoEmbeddable: "true", videoSyndicated: "true",
      maxResults: "50", order: "relevance"
    }, apiKey).catch(() => ({ items: [] as SearchItem[] }))
  ));

  // Never let a large MEMET ÇINAR upload archive occupy the entire 50-video
  // YouTube details request. Reserve slots for other artists and formats.
  const ownIds = [...new Set(ownUploadIds)].slice(0, searchQuery?.trim() ? 0 : 8);
  const discoveryIds: string[] = [];
  const seenDiscovery = new Set<string>();
  const perQueryLimit = searchQuery?.trim() ? 50 : 7;
  for (let index = 0; index < perQueryLimit; index += 1) {
    for (const result of discovered) {
      const id = result.items?.[index]?.id?.videoId;
      if (id && !seenDiscovery.has(id)) {
        seenDiscovery.add(id);
        discoveryIds.push(id);
      }
    }
  }
  const ids = [...new Set([...ownIds, ...discoveryIds])].slice(0, 50);
  if (!ids.length) return [];

  const detailData = await youtube<VideoItem>("videos", {
    part: "snippet,status,contentDetails", id: ids.join(",")
  }, apiKey);

  const clips = (detailData.items || [])
    .filter((video) => {
      const duration = parseDuration(video.contentDetails?.duration || "");
      const title = video.snippet?.title || "";
      const description = video.snippet?.description || "";
      const markedShort = /#shorts|\bshorts\b|short video/i.test(title + " " + description);
      const thumbnails = Object.values(video.snippet?.thumbnails || {});
      const hasLandscapeThumbnail = thumbnails.some((image) =>
        typeof image.width === "number" && typeof image.height === "number" &&
        image.width > image.height
      );
      return Boolean(video.id) &&
        video.status?.privacyStatus === "public" &&
        video.status?.embeddable === true &&
        video.status?.madeForKids !== true &&
        duration > 180 &&
        !markedShort &&
        (thumbnails.length === 0 || hasLandscapeThumbnail);
    })
    .map((video) => {
      const title = video.snippet?.title?.trim() || "İsimsiz müzik videosu";
      const description = video.snippet?.description || "";
      return {
        id: video.id as string,
        title,
        artist: video.snippet?.channelTitle?.trim() || "Bilinmeyen Sanatçı",
        category: categoryFor(title, description),
        videoType: videoTypeFor(title, description),
        durationSeconds: parseDuration(video.contentDetails?.duration || "") || 240
      };
    });

  if (!clips.length && !searchQuery) {
    throw new Error("YouTube'da yayınlanabilir uzun formatlı müzik videosu bulunamadı.");
  }
  return clips;
}
