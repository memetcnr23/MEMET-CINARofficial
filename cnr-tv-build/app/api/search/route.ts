import { NextResponse } from "next/server";
import { getYouTubeCatalog } from "@/lib/youtube-catalog";
import { artistsFromClips,getDatabaseArtists,mergeArtists } from "@/lib/artist-directory";
import { getSupabaseRestConfig } from "@/lib/supabase-server";
export const dynamic="force-dynamic";
export async function GET(request:Request){const query=new URL(request.url).searchParams.get("q")?.trim()||"";if(query.length<2)return NextResponse.json({error:"En az iki karakter girin."},{status:400});try{const [clips,dbArtists]=await Promise.all([getYouTubeCatalog(query),getDatabaseArtists(query)]);return NextResponse.json({clips,artists:mergeArtists(dbArtists,artistsFromClips(clips)),databaseConnected:Boolean(getSupabaseRestConfig()),source:"YouTube Data API v3 + CNR Artist Directory"},{headers:{"Cache-Control":"no-store, max-age=0"}});}catch(error){const message=error instanceof Error?error.message:"Arama tamamlanamadı.";return NextResponse.json({error:message},{status:502});}}
