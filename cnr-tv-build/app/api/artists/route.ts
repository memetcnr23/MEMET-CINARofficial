import { NextResponse } from "next/server";
import { getYouTubeCatalog } from "@/lib/youtube-catalog";
import { artistsFromClips, getDatabaseArtists, mergeArtists } from "@/lib/artist-directory";
import { getSupabaseRestConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("q")?.trim() || undefined;
  const [clips, dbArtists] = await Promise.all([
    getYouTubeCatalog(search).catch(() => []),
    getDatabaseArtists(search).catch(() => [])
  ]);
  const artists = mergeArtists(dbArtists, artistsFromClips(clips));
  return NextResponse.json({
    artists,
    databaseConnected: Boolean(getSupabaseRestConfig()),
    source: "CNR Artist Directory + YouTube Data API v3",
    catalogAvailable: clips.length > 0
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
