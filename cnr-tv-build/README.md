# CNR Müzik TV®

Responsive Next.js 16 / React 19 music television interface built from the supplied desktop and mobile reference. The existing production domain and the repository's main application remain untouched.

## Run
```bash
npm install
npm run dev
```

## Production
```bash
npm run build
npm run start
```

## Included
- Separate responsive desktop and mobile broadcast layouts.
- Supplied CNR logo and Atatürk / Turkish flag artwork.
- Live-player surface powered by the YouTube IFrame API. The first clip is cued, not autoplayed.
- Play/pause, mute, progress/seek, HD quality request, fullscreen and automatic next clip.
- Programme guide, genre selection, searchable clip library, artist shortcuts and social links.
- Animated Music Lower Third with CNR branding, track metadata, equalizer bars, metallic light sweep and red broadcast glow.

## Broadcast note
The playlist is sample YouTube video content. A true continuous 24/7 linear channel requires CNR's rights-cleared HLS/RTMP stream URL and a programme metadata feed. YouTube clips are not represented as a continuous broadcast feed.


## Supabase database

This app supports a persistent Supabase PostgreSQL database for the clip catalogue, daily broadcast schedule and playback analytics. Apply `supabase/migrations/202611060001_cnr_tv_schema.sql` in the Supabase SQL Editor, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project (Preview first, then Production when ready). The browser never receives a service-role key. Until those two variables are configured and the migration is applied, the UI intentionally falls back to the sample catalogue and displays **DEMO MODU**.

## Player behavior

The CNR fullscreen button expands the complete broadcast stage (not just the cross-origin YouTube iframe). YouTube controls are disabled with the supported embed parameter. YouTube may still show channel/title/branding layers in some states; those cannot be fully removed through supported IFrame parameters.
