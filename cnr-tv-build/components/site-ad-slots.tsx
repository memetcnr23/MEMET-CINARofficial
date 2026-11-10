import AdPlacement from "@/components/ad-placement";

export default function SiteAdSlots() {
  const top = process.env.NEXT_PUBLIC_ADSENSE_SLOT_GLOBAL_TOP || "";
  const bottom = process.env.NEXT_PUBLIC_ADSENSE_SLOT_GLOBAL_BOTTOM || "";
  return <>
    <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5" aria-label="Sponsorlu içerik üst reklam alanı">
      <AdPlacement slot={top} label="CNR Müzik TV · Sponsorlu alan" format="auto" className="my-3" />
    </div>
    <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5" aria-label="Sponsorlu içerik alt reklam alanı">
      <AdPlacement slot={bottom} label="CNR Müzik TV · Sponsorlu alan" format="auto" className="my-3" />
    </div>
  </>;
}
