import { notFound } from "next/navigation";
import BroadcastApp from "@/components/broadcast-app";

const allowed = new Set([
  "canli-yayin", "yayin-akisi", "programlar", "muzik-listeleri",
  "sanatcilar", "klip-arsivi", "haberler", "etkinlikler", "hakkimizda", "profil", "istatistikler"
]);

export default async function SectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  if (!allowed.has(path) && !(slug.length === 2 && slug[0] === "sanatci" && /^[\p{L}\p{N}-]+$/u.test(slug[1]))) notFound();
  return <BroadcastApp />;
}