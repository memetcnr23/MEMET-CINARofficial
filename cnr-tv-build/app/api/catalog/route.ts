import { NextResponse } from "next/server";
import { getYouTubeCatalog } from "@/lib/youtube-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clips = await getYouTubeCatalog();
    return NextResponse.json(
      { source: "YouTube Data API v3", clips },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube kataloğu alınamadı.";
    return NextResponse.json({ error: message }, { status: message.includes("tanımlı") ? 503 : 502 });
  }
}