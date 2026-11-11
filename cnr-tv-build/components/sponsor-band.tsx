"use client";

import "./sponsor-band.css";

const sponsors = [
  { name: "CNR MÜZİK TV", sub: "TELEVİZYON", tone: "tv", mark: "CNR", accent: "MUSIC TV" },
  { name: "CNR TECHNOLOGY", sub: "DIGITAL SYSTEMS", tone: "tech", mark: "CNR", accent: "TECH" },
  { name: "CNR MÜZİK YAPIM", sub: "PLAK ŞİRKETİ", tone: "label", mark: "CNR", accent: "MÜZİK YAPIM" },
  { name: "CNR ASSOCIATION", sub: "COMMUNITY", tone: "association", mark: "CA", accent: "ASSOCIATION" },
  { name: "ÇINAR KAFE", sub: "TATLI SOHBETLERİN ADRESİ", tone: "cafe", mark: "Ç", accent: "KAFE" },
  { name: "T STAR", sub: "YAŞAMI KOLAYLAŞTIRIR", tone: "star", mark: "★", accent: "T STAR" },
  { name: "MALATYA ÖZ ÇINAR", sub: "TURİZM", tone: "tourism", mark: "ÖÇ", accent: "TURİZM" },
  { name: "MEMET ÇINAR", sub: "OFFICIAL ARTIST", tone: "artist", mark: "MC", accent: "ARTIST" },
  { name: "CNR MÜZİK YAPIM", sub: "FİLM PRODÜKSİYON", tone: "film", mark: "CNR", accent: "FILM" },
  { name: "CNR GENÇ", sub: "GENÇLİK", tone: "young", mark: "C", accent: "GENÇ" }
];

export default function SponsorBand() {
  return <section className="cnr-sponsor-band" aria-label="CNR Müzik TV sponsorları">
    <div className="cnr-sponsor-heading"><span /> <b>SPONSORLARIMIZ & İŞ ORTAKLARIMIZ</b> <span /></div>
    <div className="cnr-sponsor-grid">
      {sponsors.map((sponsor) => <div className={"cnr-sponsor-logo " + sponsor.tone} key={sponsor.tone} aria-label={sponsor.name}>
        {sponsor.tone === "tv" || sponsor.tone === "label" ? <img className="cnr-sponsor-image" src="/cnr-logo.webp" alt={sponsor.name + " logosu"} /> :
          <div className={"cnr-partner-mark mark-" + sponsor.tone}>
            <span className="cnr-partner-symbol">{sponsor.mark}</span>
            <span className="cnr-partner-word">{sponsor.accent}</span>
          </div>}
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
