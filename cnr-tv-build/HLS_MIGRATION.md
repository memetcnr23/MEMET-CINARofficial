# CNR Müzik TV — HLS yayın kurulumu

Uygulama artık HLS öncelikli oynatma yapısını destekler. HLS manifesti tanımlı klip doğrudan `.m3u8` üzerinden oynatılır; kaynağı henüz eklenmemiş mevcut katalog klipleri geçiş süresince YouTube yedek oynatıcısını kullanır.

## 1. Medya dosyalarını hazırlayın

Yalnızca CNR Müzik TV'nin yayın hakkına sahip olduğu orijinal/master video dosyalarını kullanın. YouTube bağlantısı tek başına bir HLS kaynağı değildir; bu uygulama YouTube URL'sini indirmez veya dönüştürmez.

Her klip için aşağıdaki dosya ağacını oluşturun:

```
master.m3u8
0/index.m3u8
0/segment_00000.ts
1/index.m3u8
1/segment_00000.ts
2/index.m3u8
2/segment_00000.ts
```

FFmpeg kurulu bir makinede:

```bash
npm run hls:encode -- ./master-video.mp4 ./output/cnr-clip-v1
```

Komut 1080p, 720p ve 480p varyantları ile altı saniyelik HLS segmentleri üretir.

## 2. Vercel Blob'a yükleyin

Vercel Dashboard → Storage → Create Store → Blob → **Public** seçin. Store'u bu projeye bağlayın. Yerel ortamınızda `BLOB_READ_WRITE_TOKEN` bulunmalıdır.

Ardından her klip için benzersiz bir sürüm klasörü kullanın:

```bash
npm run hls:upload -- ./output/cnr-clip-v1 cnr/clips/CLIP_ID/v1
```

Komut bütün manifestleri ve segmentleri yükler, ardından `master.m3u8` adresini yazdırır. Yeniden yükleme yaparken `v2`, `v3` gibi yeni bir klasör kullanın; segmentler uzun süre cache'lenebilir.

## 3. Klip manifestlerini yayın çizelgesine bağlayın

Vercel Project → Settings → Environment Variables içine sunucu değişkeni olarak `CNR_HLS_CLIP_MAP` ekleyin. Değeri JSON nesnesi olmalıdır. Anahtar, yayın kataloğunda görünen klip ID'si; değer ise yüklediğiniz master manifest adresidir:

```json
{
  "YOUTUBE_VIDEO_ID_1": "https://YOUR_PUBLIC_BLOB_HOST/cnr/clips/YOUTUBE_VIDEO_ID_1/v1/master.m3u8",
  "YOUTUBE_VIDEO_ID_2": "https://YOUR_PUBLIC_BLOB_HOST/cnr/clips/YOUTUBE_VIDEO_ID_2/v1/master.m3u8"
}
```

Kaydedip yeniden deploy edin. `/api/now-playing` yanıtındaki `hls.configuredClips` değeri eşlenmiş klip sayısını, `hls.fallbackClips` ise hâlâ yedek oynatıcı kullanan klip sayısını gösterir.

Tek bir sürekli HLS kanal manifesti kullanıyorsanız ayrıca `NEXT_PUBLIC_CNR_HLS_URL` değişkenini tanımlayın. Bu ayar yapıldığında sürekli akış, klip başına manifestlerin önüne geçer.

## 4. CORS ve içerik tipleri

HLS.js, master playlist, varyant playlistleri ve bütün segmentler için tarayıcıdan GET erişimi ve CORS izni gerektirir. Medya hostunuzda CNR web alan adından gelen GET/HEAD isteklerine izin verin. İçerik tipleri:

- `.m3u8`: `application/vnd.apple.mpegurl`
- `.ts`: `video/mp2t`
- `.m4s`: `video/iso.segment`
- `.mp4`: `video/mp4`

Playlist içindeki segment yolları göreliyse aynı klasör yapısını depoda da koruyun.

## 5. Sınırlar ve geçiş planı

Web uygulaması HLS manifestlerini oynatır, VOD kliplerini ortak yayın saatindeki doğru konuma alır ve harici kontrolleri yönetir. FFmpeg dönüştürme/yükleme adımları medya sahibinin makinesinde çalışır. Vercel uygulaması 7/24 FFmpeg encoder veya canlı ingest sunucusu değildir; sürekli bir canlı kanal üretmek için ayrıca sürekli çalışan bir medya işçisi gerekir.

Bütün klipler HLS'ye dönüştürülüp `CNR_HLS_CLIP_MAP` içine eklendiğinde yayın bütünüyle HLS üzerinden yürür. Eşlenmemiş klipler için geçiş süresince YouTube yedeği açık kalır.
