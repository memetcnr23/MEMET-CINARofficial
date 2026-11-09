"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

type AdPlacementProps = {
  slot?: string;
  label?: string;
  format?: "auto" | "horizontal" | "rectangle";
  className?: string;
};

export default function AdPlacement({
  slot = "",
  label = "Sponsorlu içerik",
  format = "auto",
  className = ""
}: AdPlacementProps) {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!slot || !adRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense may reject a slot while the site is under review or the slot is not active.
    }
  }, [slot]);

  return (
    <aside className={`cnr-ad-placement ${className}`} aria-label="Reklam alanı">
      <div className="cnr-ad-heading">
        <span>{label}</span>
        <span className="cnr-ad-sponsored">REKLAM</span>
      </div>
      {slot ? (
        <ins
          ref={adRef}
          className="adsbygoogle cnr-ad-unit"
          style={{ display: "block" }}
          data-ad-client="ca-pub-6127233618306992"
          data-ad-slot={slot}
          data-ad-format={format === "auto" ? "auto" : undefined}
          data-full-width-responsive="true"
        />
      ) : (
        <div className={`cnr-ad-placeholder cnr-ad-${format}`}>
          <span className="cnr-ad-placeholder-mark">CNR</span>
          <div>
            <b>Reklam alanı</b>
            <small>Reklam gösterimi için AdSense reklam birimi kimliği bekleniyor.</small>
          </div>
          <span className="cnr-ad-placeholder-size">{format === "rectangle" ? "300 × 250" : "RESPONSIVE"}</span>
        </div>
      )}
    </aside>
  );
}
