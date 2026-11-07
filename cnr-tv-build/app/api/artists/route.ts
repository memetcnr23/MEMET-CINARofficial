import { NextResponse } from "next/server";
import { getYouTubeCatalog } from "@/lib/youtube-catalog";
import { artistsFromClips,getDatabaseArtists,mergeArtists } from "@/lib/artist-directory";
import { getSupabaseRestConfig } from "@/lib/supabase-server";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const search=new URL(request.url).searchParams.get("q")?.trim()||undefined;const [clips,dbArtists]=await Promise.all([getYouTubeCatalog(search),getDatabaseArtists(search)]);return NextResponse.json({artists:mergeArtists(dbArtists,artistsFromClips(clips)),databaseConnected:Boolean(getSupabaseRestConfig()),source:"CNR Artist Directory + YouTube Data API v3"},{headers:{"Cache-Control":"no-store, max-age=0"}});}catch(error){const message=error instanceof Error?error.message:"Sanatçı kataloğu alınamadı.";return NextResponse.json({error:message},{status:502});}}
