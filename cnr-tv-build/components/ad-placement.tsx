"use client";

import { useEffect, useRef, useState } from "react";

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
  const [nearViewport, setNearViewport] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!slot || requested) return;
    const node = adRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px", threshold: 0.01 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [slot, requested]);

  useEffect(() => {
    if (!slot || !nearViewport || requested || !adRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setRequested(true);
    } catch {
      // A blocked or unavailable ad must not affect the rest of the page.
    }
  }, [slot, nearViewport, requested]);

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
          style={{ display: "block", minHeight: format === "rectangle" ? 250 : 90 }}
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
