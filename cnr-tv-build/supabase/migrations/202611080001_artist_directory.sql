create extension if not exists pgcrypto;
create table if not exists public.artists (
 id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text not null, genre text not null default 'Müzik Sanatçısı', bio text not null default '',
 avatar_url text, cover_url text, youtube_url text, instagram_url text, spotify_url text,
 is_verified boolean not null default false, verification_source text, verified_at timestamptz,
 is_published boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists artists_published_name_idx on public.artists (is_published,name);
create index if not exists artists_slug_idx on public.artists (slug);
alter table public.artists enable row level security;
drop policy if exists "Public can read published CNR artist profiles" on public.artists;
create policy "Public can read published CNR artist profiles" on public.artists for select to anon,authenticated using (is_published=true);
grant select on public.artists to anon,authenticated;
insert into public.artists(slug,name,genre,bio,youtube_url,instagram_url,is_verified,verification_source,verified_at,is_published)
values('memet-cinar','Memet Çınar','Türkçe Pop · Pop-Rap','CNR Müzik Yapım bünyesinde müzik çalışmalarını sürdüren sanatçı.','https://youtube.com/@memetcinar444','https://instagram.com/memetcinarofficial',true,'CNR Müzik Yapım®',now(),true)
on conflict(slug) do update set name=excluded.name,genre=excluded.genre,bio=excluded.bio,youtube_url=excluded.youtube_url,instagram_url=excluded.instagram_url,is_verified=true,verification_source=excluded.verification_source,verified_at=coalesce(public.artists.verified_at,now()),is_published=true,updated_at=now();
