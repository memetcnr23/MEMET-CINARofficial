#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-}"
OUTPUT_DIR="${2:-}"

if [[ -z "$INPUT" || -z "$OUTPUT_DIR" ]]; then
  echo "Kullanım: npm run hls:encode -- input.mp4 output/clip-version" >&2
  exit 2
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg bulunamadı. Önce FFmpeg kurun." >&2
  exit 2
fi
if [[ ! -f "$INPUT" ]]; then
  echo "Giriş video dosyası bulunamadı: $INPUT" >&2
  exit 2
fi

mkdir -p "$OUTPUT_DIR/0" "$OUTPUT_DIR/1" "$OUTPUT_DIR/2"

ffmpeg -hide_banner -y -i "$INPUT" \
  -filter_complex "[0:v:0]fps=25,split=3[v1080src][v720src][v480src];[v1080src]scale=-2:1080:force_original_aspect_ratio=decrease[v1080];[v720src]scale=-2:720:force_original_aspect_ratio=decrease[v720];[v480src]scale=-2:480:force_original_aspect_ratio=decrease[v480]" \
  -map "[v1080]" -map 0:a:0? -c:v:0 libx264 -preset veryfast -profile:v:0 high -pix_fmt yuv420p -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k -g:v:0 150 -keyint_min:v:0 150 -sc_threshold:v:0 0 -c:a:0 aac -b:a:0 192k -ar:a:0 48000 -ac:a:0 2 \
  -map "[v720]" -map 0:a:0? -c:v:1 libx264 -preset veryfast -profile:v:1 main -pix_fmt yuv420p -b:v:1 2800k -maxrate:v:1 3000k -bufsize:v:1 4200k -g:v:1 150 -keyint_min:v:1 150 -sc_threshold:v:1 0 -c:a:1 aac -b:a:1 128k -ar:a:1 48000 -ac:a:1 2 \
  -map "[v480]" -map 0:a:0? -c:v:2 libx264 -preset veryfast -profile:v:2 main -pix_fmt yuv420p -b:v:2 1400k -maxrate:v:2 1500k -bufsize:v:2 2100k -g:v:2 150 -keyint_min:v:2 150 -sc_threshold:v:2 0 -c:a:2 aac -b:a:2 96k -ar:a:2 48000 -ac:a:2 2 \
  -f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p" \
  -hls_segment_filename "$OUTPUT_DIR/%v/segment_%05d.ts" \
  "$OUTPUT_DIR/%v/index.m3u8"

echo "HLS master manifest: $OUTPUT_DIR/master.m3u8"
