import AdPlacement from "@/components/ad-placement";

export function SiteAdTop() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_GLOBAL_TOP || "";
  return <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5" aria-label="Sponsorlu içerik üst reklam alanı"><AdPlacement slot={slot} label="CNR Müzik TV · Sponsorlu alan" format="auto" className="my-3" /></div>;
}
export function SiteAdBottom() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_GLOBAL_BOTTOM || "";
  return <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5" aria-label="Sponsorlu içerik alt reklam alanı"><AdPlacement slot={slot} label="CNR Müzik TV · Sponsorlu alan" format="auto" className="my-3" /></div>;
}
