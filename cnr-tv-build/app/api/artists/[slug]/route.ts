import { NextResponse } from "next/server";
import { getDatabaseArtist,artistsFromClips } from "@/lib/artist-directory";
import { getYouTubeCatalog } from "@/lib/youtube-catalog";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){try{const {slug}=await params;const stored=await getDatabaseArtist(slug);if(stored)return NextResponse.json({artist:stored,databaseConnected:true});const clips=await getYouTubeCatalog(slug.replace(/-/g," "));const discovered=artistsFromClips(clips).find((artist)=>artist.slug===slug);if(!discovered)return NextResponse.json({error:"Sanatçı profili bulunamadı."},{status:404});return NextResponse.json({artist:discovered,databaseConnected:false});}catch(error){const message=error instanceof Error?error.message:"Sanatçı profili alınamadı.";return NextResponse.json({error:message},{status:502});}}
