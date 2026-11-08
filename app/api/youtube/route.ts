import { NextResponse } from "next/server";

export const revalidate = 900;

type YouTubeItem = {
  id: string;
  snippet: { title: string; channelTitle: string; thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } } };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean };
};

function durationLabel(value = "") {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "—";
  const h = Number(match[1] || 0), m = Number(match[2] || 0), s = Number(match[3] || 0);
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}
function category(title: string) {
  const t = title.toLocaleLowerCase("tr");
  if (/lyrics?|lyric video|şarkı sözleri/.test(t)) return "Şarkı Sözleri";
  if (/visuali[sz]er/.test(t)) return "Visualizer";
  if (/audio|official audio/.test(t)) return "Audio";
  return "Klip";
}

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ tracks: [], error: "Kanal videolarını otomatik çekmek için Vercel ortam değişkenlerine YOUTUBE_API_KEY eklenmeli." }, { status: 200 });
  try {
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.search = new URLSearchParams({ part: "contentDetails,snippet", forHandle: "memetcinar444", key }).toString();
    const channelRes = await fetch(channelUrl, { next: { revalidate: 900 } });
    if (!channelRes.ok) throw new Error("YouTube kanal bilgisi alınamadı. API anahtarını ve YouTube Data API v3 erişimini kontrol et.");
    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];
    if (!channel) throw new Error("@memetcinar444 kanalı bulunamadı.");
    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
    const listUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    listUrl.search = new URLSearchParams({ part: "snippet,contentDetails", playlistId, maxResults: "50", key }).toString();
    const listRes = await fetch(listUrl, { next: { revalidate: 900 } });
    if (!listRes.ok) throw new Error("YouTube video listesi alınamadı.");
    const listData = await listRes.json();
    const ids = (listData.items || []).map((x: { contentDetails?: { videoId?: string } }) => x.contentDetails?.videoId).filter(Boolean);
    if (!ids.length) return NextResponse.json({ tracks: [] });
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.search = new URLSearchParams({ part: "contentDetails,status,snippet", id: ids.join(","), key }).toString();
    const detailsRes = await fetch(detailsUrl, { next: { revalidate: 900 } });
    if (!detailsRes.ok) throw new Error("Video ayrıntıları alınamadı.");
    const details = await detailsRes.json();
    const tracks = (details.items as YouTubeItem[] || []).filter(v => {
      const seconds = (v.contentDetails?.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []).slice(1).reduce((n, x, i) => n + Number(x || 0) * [3600,60,1][i], 0);
      return v.status?.embeddable !== false && seconds > 60;
    }).map(v => ({
      id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || "",
      category: category(v.snippet.title), duration: durationLabel(v.contentDetails?.duration),
      url: `https://www.youtube.com/watch?v=${v.id}`,
    }));
    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json({ tracks: [], error: error instanceof Error ? error.message : "Beklenmeyen YouTube API hatası." }, { status: 200 });
  }
}
