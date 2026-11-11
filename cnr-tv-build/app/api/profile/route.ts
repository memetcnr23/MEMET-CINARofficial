import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const { data: profile, error } = await supabase.from("profiles")
    .select("id,username,full_name,avatar_url,bio,role,is_public,created_at,updated_at")
    .eq("id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: "Profil yüklenemedi." }, { status: 502 });
  return NextResponse.json({ user: { id: userId, email: claimsData?.claims?.email ?? null }, profile }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" }
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    return NextResponse.json({ error: "Oturum açılmamış." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined;
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
  const bio = typeof body.bio === "string" ? body.bio.trim() : undefined;
  if (username !== undefined && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "Kullanıcı adı 3–24 karakter olmalı; küçük harf, rakam ve alt çizgi kullanın." }, { status: 400 });
  }
  if (fullName !== undefined && fullName.length > 80) return NextResponse.json({ error: "Ad en fazla 80 karakter olabilir." }, { status: 400 });
  if (bio !== undefined && bio.length > 500) return NextResponse.json({ error: "Biyografi en fazla 500 karakter olabilir." }, { status: 400 });
  if (username === undefined && fullName === undefined && bio === undefined) {
    return NextResponse.json({ error: "Güncellenecek alan bulunamadı." }, { status: 400 });
  }
  const update: Record<string, string> = {};
  if (username !== undefined) update.username = username;
  if (fullName !== undefined) update.full_name = fullName;
  if (bio !== undefined) update.bio = bio;
  const { data, error } = await supabase.from("profiles").upsert({ id: userId, ...update })
    .select("id,username,full_name,avatar_url,bio,role,is_public,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Bu kullanıcı adı kullanımda." : "Profil kaydedilemedi." }, { status: error.code === "23505" ? 409 : 502 });
  return NextResponse.json({ profile: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
