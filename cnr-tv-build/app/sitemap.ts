import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://cnr-muzik-tv.vercel.app";
  const paths = ["/","/canli-yayin","/yayin-akisi","/programlar","/muzik-listeleri","/sanatcilar","/klip-arsivi","/haberler","/etkinlikler","/hakkimizda","/gizlilik-politikasi","/cerez-politikasi","/kullanim-kosullari","/reklam-ve-gelir"];
  return paths.map((path) => ({ url: base + path, lastModified: new Date(), changeFrequency: "weekly", priority: path === "/" ? 1 : 0.6 }));
}