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
- HLS-first live playout: uses CNR HLS manifests when configured and the existing YouTube embed catalogue as a temporary fallback for clips without HLS assets.
- Play/pause, mute, progress/seek, HD quality request, fullscreen and automatic next clip.
- Programme guide, genre selection, searchable clip library, artist shortcuts and social links.
- Animated Music Lower Third with CNR branding, track metadata, equalizer bars, metallic light sweep and red broadcast glow.

## Broadcast note
The 47-item sample playlist currently contains YouTube video IDs and no per-clip HLS assets. In default automatic mode the live player therefore plays the YouTube embed fallback so the channel is not left blank. This is a scheduled embed playlist, not a rights-cleared, independently-originated 24/7 HLS channel. YouTube's player branding and some overlays may remain visible.

For full CNR branding, use only videos CNR owns or is licensed to distribute, encode them with the HLS workflow below, upload the generated files, and set `CNR_HLS_CLIP_MAP` in Vercel Production to a JSON object mapping clip IDs to their public HTTPS `master.m3u8` URLs. HLS assets automatically take priority over the YouTube fallback. A continuous encoder/origin can instead be configured with `NEXT_PUBLIC_CNR_HLS_URL`.

### HLS asset workflow
- Install FFmpeg on a machine that has the licensed source MP4 files.
- Encode one clip: `npm run hls:encode -- ./licensed-video.mp4 ./output/clip-version`.
- Connect a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN` in the publishing environment.
- Upload the manifest and segments: `npm run hls:upload -- ./output/clip-version cnr/clips/CLIP_ID/v1`.
- Copy the emitted `master.m3u8` URL into the `CNR_HLS_CLIP_MAP` JSON mapping for that clip ID.
- Leave `NEXT_PUBLIC_CNR_PLAYER_MODE` unset for automatic HLS-first/fallback playback. Set it to `hls` only after the HLS assets are ready if you want to disable all YouTube fallback playback.


## Supabase database

This app supports a persistent Supabase PostgreSQL database for the clip catalogue, daily broadcast schedule and playback analytics. Apply `supabase/migrations/202611060001_cnr_tv_schema.sql` in the Supabase SQL Editor, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted)` in the Vercel project (Preview first, then Production when ready). The browser never receives a service-role key. Until those two variables are configured and the migration is applied, the UI intentionally falls back to the sample catalogue and displays **DEMO MODU**.

## Player behavior

The CNR fullscreen button expands the complete broadcast stage. The default live path is automatic and HLS-first: if the current clip has an HTTPS HLS manifest (or a continuous HLS URL is configured), the page uses a native HTML video element with hls.js on Media Source Extensions browsers and native HLS on Safari/iOS. If that clip has no HLS asset, the existing YouTube IFrame embed is used as a temporary fallback. This fallback can show YouTube branding/overlays; it cannot be fully white-labelled. Set NEXT_PUBLIC_CNR_PLAYER_MODE=hls to force HLS-only operation (the player will wait for HLS media rather than fall back).
