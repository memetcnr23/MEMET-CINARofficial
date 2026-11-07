import { notFound } from "next/navigation";
import BroadcastApp from "@/components/broadcast-app";

const allowed = new Set([
  "canli-yayin", "yayin-akisi", "programlar", "muzik-listeleri",
  "sanatcilar", "klip-arsivi", "haberler", "etkinlikler", "hakkimizda", "profil"
]);

export default async function SectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  if (!allowed.has(path) && path !== "sanatci/memet-cinar") notFound();
  return <BroadcastApp />;
}