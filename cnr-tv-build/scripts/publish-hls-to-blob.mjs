import { put } from "@vercel/blob";
import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const sourceDir = process.argv[2];
const prefix = (process.argv[3] || "").replace(/^\/+|\/+$/g, "");

if (!sourceDir || !prefix) {
  console.error("Kullanım: npm run hls:upload -- ./output/clip-version cnr/clips/CLIP_ID/v1");
  process.exit(2);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN bulunamadı. Vercel Blob store'u projeye bağlayın.");
  process.exit(2);
}

const root = resolve(sourceDir);
const mimeTypes = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4"
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

const files = await walk(root);
if (!files.length) {
  console.error("Yüklenecek HLS dosyası bulunamadı:", root);
  process.exit(2);
}

let masterUrl = "";
for (const filePath of files) {
  const relativePath = relative(root, filePath).split(sep).join("/");
  const pathname = prefix + "/" + relativePath;
  const extension = extname(filePath).toLowerCase();
  const isPlaylist = extension === ".m3u8";
  const result = await put(pathname, await readFile(filePath), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: mimeTypes[extension] || "application/octet-stream",
    cacheControlMaxAge: isPlaylist ? 60 : 31536000
  });
  console.log(result.url);
  if (relativePath === "master.m3u8") masterUrl = result.url;
}

if (!masterUrl) {
  console.error("master.m3u8 bulunamadı. Yüklenen dosyalar klip manifesti olarak kullanılamaz.");
  process.exit(1);
}
console.log("\nCNR_HLS_CLIP_MAP için manifest adresi:");
console.log(masterUrl);
