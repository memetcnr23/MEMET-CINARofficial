import { NextResponse } from "next/server";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const FEEDS = [
  { name: "TRT Haber", url: "https://www.trthaber.com/sondakika.rss", category: "Gündem" },
  { name: "BBC News Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml", category: "Dünya" },
  { name: "Anadolu Ajansı", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel", category: "Gündem" },
  { name: "NTV", url: "https://www.ntv.com.tr/son-dakika.rss", category: "Gündem" },
];

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function tag(block: string, name: string) {
  const match = block.match(new RegExp("<(?:[\\w.-]+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?"+name+">", "i"));
  return match ? decode(match[1]) : "";
}

function classify(title: string, summary: string, fallback: string) {
  const text = (title + " " + summary).toLocaleLowerCase("tr");
  if (/müzik|şarkı|albüm|konser|şarkıcı|sanatçı|spotify|klip|festival|rapçi|pop müzik/.test(text)) return "Müzik";
  if (/magazin|ünlü|oyuncu|dizi|film yıldız|kırmızı halı|televizyon yıldız|aşk hayatı/.test(text)) return "Magazin";
  if (/futbol|basketbol|voleybol|şampiyon|maç sonucu|millî takım|sporcu|transfer/.test(text)) return "Spor";
  if (/yapay zekâ|yapay zeka|teknoloji|telefon|uygulama|siber|yazılım|bilgisayar|internet|çip|robot/.test(text)) return "Teknoloji";
  if (/türkiye|ankara|istanbul|izmir|malatya|bakanlık|tbmm|cumhurbaşkanı|valilik/.test(text)) return "Türkiye";
  return fallback;
}

function parseFeed(xml: string, feed: typeof FEEDS[number]) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
  return blocks.slice(0, 25).map(block => {
    const title = tag(block, "title");
    const linkTag = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
    const link = tag(block, "link") || linkTag?.[1] || tag(block, "guid");
    const description = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const date = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    const image = block.match(/<media:content[^>]+url=["']([^"']+)/i)?.[1] || block.match(/<enclosure[^>]+url=["']([^"']+)/i)?.[1] || block.match(/<media:thumbnail[^>]+url=["']([^"']+)/i)?.[1] || null;
    const publishedAt = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString();
    return { title, summary: description.slice(0, 360), url: link, image, source: feed.name, category: classify(title, description, feed.category), publishedAt };
  }).filter(item => item.title.length > 8 && /^https?:\/\//i.test(item.url));
}

export async function GET() {
  const results = await Promise.allSettled(FEEDS.map(async feed => {
    const response = await fetch(feed.url, { headers: { "user-agent": "CNRMuzikTV-News/1.0 (+https://cnr-muzik-tv.vercel.app)" }, signal: AbortSignal.timeout(6500), next: { revalidate: 300 } });
    if (!response.ok) throw new Error(feed.name + " HTTP " + response.status);
    return parseFeed(await response.text(), feed);
  }));
  const articles = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  const unique = [...new Map(articles.map(item => [item.url, item])).values()]
    .sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0, 60);
  return NextResponse.json({ articles: unique, updatedAt: new Date().toISOString(), sources: results.filter(r=>r.status==="fulfilled").length, totalSources: FEEDS.length, live: unique.length > 0 }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
