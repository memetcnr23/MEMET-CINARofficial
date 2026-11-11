"use client";

import "./sponsor-band.css";

const sponsors = [
  { name: "CNR MÜZİK TV", sub: "TELEVİZYON", tone: "tv" },
  { name: "CNR TECHNOLOGY", sub: "DIGITAL SYSTEMS", tone: "tech" },
  { name: "CNR MÜZİK YAPIM", sub: "PLAK ŞİRKETİ", tone: "label" },
  { name: "CNR ASSOCIATION", sub: "COMMUNITY", tone: "association" },
  { name: "ÇINAR KAFE", sub: "TATLI SOHBETLERİN ADRESİ", tone: "cafe" },
  { name: "T STAR", sub: "YAŞAMI KOLAYLAŞTIRIR", tone: "star" },
  { name: "MALATYA ÖZ ÇINAR", sub: "TURİZM", tone: "tourism" },
  { name: "MEMET ÇINAR", sub: "OFFICIAL ARTIST", tone: "artist" },
  { name: "CNR MÜZİK YAPIM", sub: "FİLM PRODÜKSİYON", tone: "film" },
  { name: "CNR GENÇ", sub: "GENÇLİK", tone: "young" }
];

export default function SponsorBand() {
  return <section className="cnr-sponsor-band" aria-label="CNR Müzik TV sponsorları">
    <div className="cnr-sponsor-heading"><span /> <b>SPONSORLARIMIZ & İŞ ORTAKLARIMIZ</b> <span /></div>
    <div className="cnr-sponsor-grid">
      {sponsors.map((sponsor) => <div className={"cnr-sponsor-logo " + sponsor.tone} key={sponsor.tone}>
        {(sponsor.tone === "tv" || sponsor.tone === "label") && <img className="cnr-sponsor-image" src="/cnr-logo.webp" alt="CNR Müzik Yapım ve CNR Müzik TV logosu" />}
        {sponsor.tone === "label" && <span className="cnr-sponsor-eq">▂▅▇▅▂</span>}
        {sponsor.tone === "association" && <span className="cnr-sponsor-crown">♛</span>}
        {sponsor.tone === "cafe" && <span className="cnr-sponsor-seal">C</span>}
        {sponsor.tone === "star" && <span className="cnr-sponsor-star">★</span>}
        <strong>{sponsor.name}</strong><small>{sponsor.sub}</small>
      </div>)}
    </div>
    <div className="cnr-sponsor-footer">
      <img src="/cnr-logo.webp" alt="CNR Müzik TV ana kanal logosu" />
      <span>© CNR Müzik Yapım® · CNR Müzik TV®</span>
      <b>MÜZİK <i>•</i> HABER <i>•</i> MAGAZİN <i>•</i> KONSER <i>•</i> KLİP</b>
    </div>
  </section>;
}
