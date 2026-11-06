create extension if not exists pgcrypto;

create table if not exists public.tv_clips (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,
  artist text not null,
  category text not null default 'Türkçe Pop',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broadcast_schedule (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null references public.tv_clips(youtube_video_id) on delete cascade,
  starts_at time not null,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.playback_events (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null references public.tv_clips(youtube_video_id) on delete cascade,
  event_type text not null check (event_type in ('play','pause','ended')),
  created_at timestamptz not null default now()
);

create index if not exists tv_clips_active_position_idx on public.tv_clips (is_active, position);
create index if not exists broadcast_schedule_sort_idx on public.broadcast_schedule (sort_order, starts_at);
create index if not exists playback_events_created_idx on public.playback_events (created_at desc);
create index if not exists playback_events_video_idx on public.playback_events (youtube_video_id);

alter table public.tv_clips enable row level security;
alter table public.broadcast_schedule enable row level security;
alter table public.playback_events enable row level security;

drop policy if exists "Public can read active CNR clips" on public.tv_clips;
create policy "Public can read active CNR clips"
  on public.tv_clips for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Public can read CNR schedule" on public.broadcast_schedule;
create policy "Public can read CNR schedule"
  on public.broadcast_schedule for select to anon, authenticated
  using (true);

drop policy if exists "Public can record CNR playback events" on public.playback_events;
create policy "Public can record CNR playback events"
  on public.playback_events for insert to anon, authenticated
  with check (event_type in ('play','pause','ended'));

insert into public.tv_clips (youtube_video_id, title, artist, category, position)
values
  ('_GOZDXq7I-I', 'Yolla', 'Tarkan', 'Türkçe Pop', 1),
  ('yQ9lXHfv9Yg', 'Antidepresan', 'Mabel Matiz', 'Pop & Dans', 2),
  ('JWLWczFtCag', 'GİT', 'BLOK3', 'Rap & Trap', 3),
  ('rR2wVaZ4Fn4', 'Ateşe Düştüm', 'Mert Demir', 'Efkar', 4),
  ('BemdSeSUJmM', 'Akustik Sahne', 'Müzik Arşivi', 'Akustik', 5),
  ('9bZkp7q19f0', 'Global Hits', 'PSY', 'Pop & Dans', 6)
on conflict (youtube_video_id) do nothing;

insert into public.broadcast_schedule (youtube_video_id, starts_at, title, description, sort_order)
values
  ('_GOZDXq7I-I', '00:00', 'CNR Station Deck', 'Müzik Kuşağı', 1),
  ('_GOZDXq7I-I', '14:00', 'Türkçe Pop Hits', 'En Sevilen Klipler', 2),
  ('JWLWczFtCag', '16:00', 'CNR Top 20', 'Haftanın Listesi', 3),
  ('yQ9lXHfv9Yg', '18:00', 'Yeni Çıkanlar', 'Klip Prömiyerleri', 4),
  ('rR2wVaZ4Fn4', '20:00', 'Efkar Gecesi', 'Duygusal Şarkılar', 5),
  ('BemdSeSUJmM', '22:00', 'Akustik Sahne', 'Canlı Performanslar', 6);
