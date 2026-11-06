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
