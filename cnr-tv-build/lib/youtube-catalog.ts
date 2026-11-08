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
  if (/k[ -]?pop|korean pop|k-pop|케이팝|아이돌/.test(value)) return "K-Pop";
  if (/akustik|unplugged|acoustic|live session|canlı performans/.test(value)) return "Akustik";
  if (/rap|trap|hip.?hop|drill|freestyle/.test(value)) return "Rap & Trap";
  if (/slow|efkar|ayrılık|hüzün|duygusal|ballad/.test(value)) return "Efkar";
  if (/dance|dans|remix|club|edm/.test(value)) return "Pop & Dans";
  if (/official music video|official video|music video|lyrics|lyric video|visualizer|official audio/.test(value) && !/türkçe|turkish|türkiye/.test(value)) return "Global Pop";
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
  const response = await fetch(url, { next: { revalidate: 21600 } });
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
        "Türkçe pop yeni çıkanlar resmi klip official music video",
        "Türkçe rap trap hip hop resmi klip official music video",
        "Türkçe rock arabesk halk müziği resmi klip",
        "Türkçe şarkılar lyric video official audio visualizer",
        "Türkiye müzik listeleri pop rap rock resmi klip",
        "K-pop official music video BLACKPINK BTS aespa NewJeans TWICE Stray Kids",
        "international pop official music video"
      ];
  const discovered = await Promise.all(discoveryQueries.map((query, index) =>
    youtube<SearchItem>("search", {
      part: "snippet", type: "video", q: query,
      videoEmbeddable: "true",
      ...(index < 4 ? { regionCode: "TR", relevanceLanguage: "tr" } : {}),
      maxResults: "50", order: "relevance"
    }, apiKey).catch(() => ({ items: [] as SearchItem[] }))
  ));

  // Fairly rotate through Turkish genres, K-pop and international music.\n  // Keep API discovery on a six-hour cache window to stay within YouTube quota.
  // YouTube search.list costs 100 quota units per query, so results are cached
  // for six hours to keep discovery broad without exhausting the daily quota.
  const ownIds = [...new Set(ownUploadIds)].slice(0, searchQuery?.trim() ? 0 : 8);
  const discoveryIds: string[] = [];
  const categoryByVideoId = new Map<string, string>();
  const seenDiscovery = new Set<string>();
  if (searchQuery?.trim()) {
    const result = discovered[0];
    for (const item of result?.items || []) {
      const id = item.id?.videoId;
      if (id && !seenDiscovery.has(id)) {
        seenDiscovery.add(id);
        discoveryIds.push(id);
      }
    }
  } else {
    // Turkish artists dominate the broadcast: reserve at least 47 of 50
    // discovery slots for Turkish music, with only 1 K-pop and 2 global clips.
    const turkishLimits = [10, 10, 10, 10, 7];
    for (const [queryIndex, limit] of turkishLimits.entries()) {
      const result = discovered[queryIndex];
      let added = 0;
      for (const item of result?.items || []) {
        const id = item.id?.videoId;
        if (id && !seenDiscovery.has(id) && added < limit) {
          seenDiscovery.add(id);
          discoveryIds.push(id);
          added += 1;
          if (queryIndex === 1) categoryByVideoId.set(id, "Rap & Trap");
          else if (queryIndex === 2) categoryByVideoId.set(id, "Türkçe Rock & Arabesk");
          else categoryByVideoId.set(id, "Türkçe Pop");
        }
      }
    }
    for (const [queryIndex, limit, category] of [[5, 1, "K-Pop"], [6, 2, "Global Pop"]] as const) {
      let added = 0;
      for (const item of discovered[queryIndex]?.items || []) {
        const id = item.id?.videoId;
        if (id && !seenDiscovery.has(id) && added < limit) {
          seenDiscovery.add(id);
          discoveryIds.push(id);
          categoryByVideoId.set(id, category);
          added += 1;
        }
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
        duration > 90 &&
        duration <= 900 &&
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
        category: categoryByVideoId.get(video.id as string) || categoryFor(title, description),
        videoType: videoTypeFor(title, description),
        durationSeconds: parseDuration(video.contentDetails?.duration || "")
      };
    });

  if (!clips.length && !searchQuery) {
    throw new Error("YouTube'da yayınlanabilir uzun formatlı müzik videosu bulunamadı.");
  }
  return clips;
}
