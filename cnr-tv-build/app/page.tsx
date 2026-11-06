"use client";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bell, CalendarDays, ChevronRight, Disc3, Guitar, Headphones, HeartCrack, Home, Layers, Menu, Mic2, MonitorPlay, Music2, Newspaper, Pause, Play, Radio, Search, Settings2, Share2, SkipBack, SkipForward, Star, Volume2, VolumeX, X, Youtube, Instagram } from "lucide-react";

type Clip = { id: string; title: string; artist: string; category: string };
type YTPlayer = {
  cueVideoById: (id: string) => void; loadVideoById: (id: string) => void;
  playVideo: () => void; pauseVideo: () => void; mute: () => void; unMute: () => void;
  isMuted: () => boolean; getCurrentTime: () => number; getDuration: () => number;
  seekTo: (time: number, ahead: boolean) => void; setPlaybackQuality: (quality: string) => void;
  getIframe: () => HTMLIFrameElement;
};
type YTEvent = { data: number };
declare global { interface Window {
  YT?: { Player: new (id: string, options: { videoId: string; playerVars?: Record<string, number>; events?: { onReady?: () => void; onStateChange?: (event: YTEvent) => void; onError?: () => void } }) => YTPlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number } };
  onYouTubeIframeAPIReady?: () => void;
} }

const clips: Clip[] = [
  { id: "_GOZDXq7I-I", title: "Yolla", artist: "Tarkan", category: "Türkçe Pop" },
  { id: "yQ9lXHfv9Yg", title: "Antidepresan", artist: "Mabel Matiz", category: "Pop & Dans" },
  { id: "JWLWczFtCag", title: "GİT", artist: "BLOK3", category: "Rap & Trap" },
  { id: "rR2wVaZ4Fn4", title: "Ateşe Düştüm", artist: "Mert Demir", category: "Efkar" },
  { id: "BemdSeSUJmM", title: "Akustik Sahne", artist: "Müzik Arşivi", category: "Akustik" },
  { id: "9bZkp7q19f0", title: "Global Hits", artist: "PSY", category: "Pop & Dans" }
];
const categories = [
  { name: "Türkçe Pop", icon: Mic2 }, { name: "Rap & Trap", icon: Headphones },
  { name: "Pop & Dans", icon: Disc3 }, { name: "Efkar", icon: HeartCrack },
  { name: "Akustik", icon: Guitar }, { name: "Yeni Çıkanlar", icon: Star },
  { name: "Top 20", icon: Activity }
];
const schedule = [
  ["Şimdi", "CNR Station Deck", "Müzik Kuşağı", 0],
  ["14:00", "Türkçe Pop Hits", "En Sevilen Klipler", 0],
  ["16:00", "CNR Top 20", "Haftanın Listesi", 2],
  ["18:00", "Yeni Çıkanlar", "Klip Prömiyerleri", 1],
  ["20:00", "Efkar Gecesi", "Duygusal Şarkılar", 3],
  ["22:00", "Akustik Sahne", "Canlı Performanslar", 4]
] as const;
const logo = "https://cnr-muzik-tv.vercel.app/cnr-logo.webp";
const thumb = (id: string, quality = "hqdefault") => "https://i.ytimg.com/vi/" + id + "/" + quality + ".jpg";
const timeText = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
};

export default function BroadcastApp() {
  const player = useRef<YTPlayer | null>(null);
  const activeIndex = useRef(0);
  const ready = useRef(false);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState("Tümü");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lowerVisible, setLowerVisible] = useState(false);
  const [lowerKey, setLowerKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const current = clips[index];

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }, []);
  const lowerThird = useCallback(() => {
    setLowerKey((v) => v + 1);
    setLowerVisible(true);
    window.setTimeout(() => setLowerVisible(false), 7600);
  }, []);
  const selectClip = useCallback((nextIndex: number, start = false) => {
    const safe = (nextIndex + clips.length) % clips.length;
    activeIndex.current = safe;
    setIndex(safe);
    if (player.current && ready.current) {
      if (start) player.current.loadVideoById(clips[safe].id);
      else {
        player.current.cueVideoById(clips[safe].id);
        setPlaying(false);
        setLowerVisible(false);
      }
    }
  }, []);
  const playPause = useCallback(() => {
    if (!player.current || !ready.current) { notify("Oynatıcı hazırlanıyor. Birkaç saniye sonra tekrar deneyin."); return; }
    if (playing) player.current.pauseVideo();
    else { player.current.loadVideoById(current.id); player.current.playVideo(); }
  }, [current.id, notify, playing]);
  const next = useCallback(() => selectClip(index + 1, true), [index, selectClip]);
  const previous = useCallback(() => selectClip(index - 1, true), [index, selectClip]);

  useEffect(() => {
    let disposed = false;
    const init = () => {
      if (disposed || !window.YT || player.current) return;
      player.current = new window.YT.Player("cnr-player-frame", {
        videoId: clips[0].id,
        playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => { ready.current = true; player.current?.cueVideoById(clips[0].id); },
          onStateChange: (event) => {
            const state = window.YT?.PlayerState;
            if (!state) return;
            if (event.data === state.PLAYING) { setPlaying(true); lowerThird(); setDuration(player.current?.getDuration() || 0); }
            else if (event.data === state.PAUSED || event.data === state.CUED) { setPlaying(false); setLowerVisible(false); }
            else if (event.data === state.ENDED) { setPlaying(false); setLowerVisible(false); selectClip(activeIndex.current + 1, true); }
          },
          onError: () => { setPlaying(false); setLowerVisible(false); notify("Bu video gömülü oynatıma kapalı. YouTube'da aç bağlantısını kullanabilirsiniz."); }
        }
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.querySelector('script[data-cnr-player]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true; script.dataset.cnrPlayer = "true";
        script.onerror = () => notify("YouTube oynatıcı API yüklenemedi.");
        document.head.appendChild(script);
      }
    }
    return () => { disposed = true; };
  }, [index, lowerThird, notify, selectClip]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!player.current || !ready.current) return;
      const now = player.current.getCurrentTime();
      const total = player.current.getDuration();
      if (Number.isFinite(now) && Number.isFinite(total) && total > 0) { setProgress(now / total * 100); setDuration(total); }
    }, 700);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { try { setFavorites(JSON.parse(localStorage.getItem("cnr-favorites") || "[]")); } catch { setFavorites([]); } }, []);

  const filtered = useMemo(() => clips.filter((clip) => {
    const categoryMatch = category === "Tümü" || category === "Top 20" || category === "Yeni Çıkanlar" || clip.category === category;
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return categoryMatch && (!q || (clip.title + " " + clip.artist + " " + clip.category).toLocaleLowerCase("tr-TR").includes(q));
  }), [category, query]);

  const toggleMute = () => {
    if (!player.current) return;
    if (player.current.isMuted()) { player.current.unMute(); setMuted(false); }
    else { player.current.mute(); setMuted(true); }
  };
  const toggleFavorite = () => {
    const updated = favorites.includes(current.id) ? favorites.filter((id) => id !== current.id) : [...favorites, current.id];
    setFavorites(updated);
    try { localStorage.setItem("cnr-favorites", JSON.stringify(updated)); } catch { /* storage is optional */ }
    notify(updated.includes(current.id) ? "Favorilerinize eklendi." : "Favorilerden çıkarıldı.");
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "CNR Müzik TV", text: current.artist + " — " + current.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); notify("Yayın bağlantısı kopyalandı."); }
    } catch { notify("Paylaşım açılamadı."); }
  };
  const go = (id: string) => {
    setMenuOpen(false);
    const targets: Record<string, string> = { home: "top", live: "live-player", programs: "schedule", lists: "categories", artists: "artists", news: "news", videos: "videos" };
    document.getElementById(targets[id] || "top")?.scrollIntoView({ behavior: "smooth" });
  };
  const menu = [
    ["Ana Sayfa", Home, "home"], ["Canlı Yayın", Radio, "live"], ["Programlar", Layers, "programs"],
    ["Müzik Listeleri", Music2, "lists"], ["Sanatçılar", Activity, "artists"], ["Haberler", Newspaper, "news"], ["Videolar", MonitorPlay, "videos"]
  ] as const;
  const toggleFullscreen = () => { const frame = player.current?.getIframe(); if (frame?.requestFullscreen) void frame.requestFullscreen().catch(() => notify("Tam ekran açılamadı.")); };

  return <main className="broadcast-shell" id="top">
    <header className="channel-header">
      <div className="brand"><Image src={logo} alt="CNR Müzik TV" width={320} height={107} unoptimized priority /><span>TÜRKİYE'NİN MÜZİK TELEVİZYONU</span></div>
      <div className="flag-banner"><Image className="ataturk-art" src="/ataturk-flag.webp" alt="Atatürk ve Türk bayrağı" width={360} height={300} unoptimized priority /><div className="banner-copy">CUMHURİYETİN IŞIĞINDA</div></div>
      <div className="header-live"><b><i /> <Radio size={17} /> CANLI YAYIN</b><span>7/24 MÜZİK</span></div>
    </header>
    <nav className="desktop-nav">{menu.map(([label, Icon, id], i) => <button key={id} className={i === 0 ? "active" : ""} onClick={() => go(id)}><Icon size={18} />{label}</button>)}<button className="nav-icon" onClick={() => setSearchOpen(true)} aria-label="Ara"><Search /></button><button className="nav-icon" onClick={() => notify("CNR duyuruları yakında.")} aria-label="Bildirim"><Bell /></button></nav>
    <div className="mobile-topbar"><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü"><Menu /></button><Image src={logo} alt="CNR Müzik TV" width={165} height={55} unoptimized /><button onClick={() => setSearchOpen(true)} aria-label="Ara"><Search /></button></div>
    {menuOpen && <div className="mobile-menu">{menu.map(([label, Icon, id]) => <button key={id} onClick={() => go(id)}>{label}<ChevronRight size={16} /></button>)}</div>}

    <div className="main-grid">
      <section className="main-column">
        <section className="live-layout" id="live-player">
          <div className="player-card">
            <div className="player-stage">
              <div id="cnr-player-frame" className="youtube-frame" />
              <div className="player-brand"><span className="live-badge"><i /> CANLI YAYIN</span><Image src={logo} alt="CNR Müzik TV" width={135} height={45} unoptimized /></div>
              {!playing && <div className="player-cover"><div className="cover-bars"><i /><i /><i /><i /><i /><i /><i /></div><b>CNR MÜZİK TV</b><span>TÜRKİYE'NİN MÜZİK TELEVİZYONU</span><button onClick={playPause}><Play fill="currentColor" size={16} /> YAYINI BAŞLAT</button></div>}
              <div className={"music-lower-third " + (lowerVisible ? "visible" : "")} key={lowerKey}>
                <div className="lower-logo"><Image src={logo} alt="" width={132} height={44} unoptimized /></div>
                <div className="lower-track"><span>ŞİMDİ ÇALIYOR <i /> CNR MÜZİK TV®</span><b>{current.title}</b><small>{current.artist}</small></div>
                <div className="lower-equalizer">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ "--h": (8 + (i * 7 % 25)) + "px", "--delay": (i * .035) + "s" } as CSSProperties} />)}</div>
                <div className="lower-onair"><small>ON AIR</small><b>HD</b></div>
              </div>
              <div className="player-controls">
                <button onClick={playPause} aria-label={playing ? "Duraklat" : "Oynat"}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
                <button onClick={toggleMute} aria-label="Sesi aç/kapat">{muted ? <VolumeX /> : <Volume2 />}</button>
                <input className="seek" type="range" min="0" max="100" step="0.1" value={progress} onChange={(e) => { const p = Number(e.target.value); setProgress(p); if (duration) player.current?.seekTo(p / 100 * duration, true); }} />
                <span className="elapsed">{timeText(progress / 100 * duration)}</span>
                <button className="hd" onClick={() => player.current?.setPlaybackQuality("hd1080")}>HD</button>
                <button onClick={toggleFullscreen} aria-label="Tam ekran"><MonitorPlay /></button>
                <button onClick={() => notify("Kalite ve altyazı ayarları YouTube tarafından desteklenir.")} aria-label="Ayarlar"><Settings2 /></button>
              </div>
            </div>
            <div className="player-caption"><div><b>{current.artist} — {current.title}</b><small>{playing ? "Şimdi Yayında" : "Oynatılmaya Hazır"}</small></div><div className="player-actions"><button onClick={previous}><SkipBack /></button><button onClick={next}><SkipForward /></button><button onClick={toggleFavorite} className={favorites.includes(current.id) ? "favorited" : ""}><Heart /></button><button onClick={share}><Share2 /></button></div></div>
          </div>
          <aside className="schedule-card" id="schedule">
            <div className="section-title"><h2><CalendarDays size={18} /> YAYIN AKIŞI</h2><button onClick={() => setExpanded(!expanded)}>{expanded ? "Daha Az" : "Tüm Program"} <ChevronRight size={14} /></button></div>
            <div className="schedule-list">{schedule.slice(0, expanded ? 6 : 5).map((row, i) => <button className={"schedule-row " + (i === 0 ? "current" : "")} key={row[0]} onClick={() => selectClip(row[3], true)}><Image src={thumb(clips[row[3]].id, "mqdefault")} alt="" width={68} height={44} unoptimized /><span className="slot-time">{row[0]}</span><span className="slot-info"><b>{row[1]}</b><small>{row[2]}</small></span></button>)}</div>
          </aside>
        </section>

        <section className="categories" id="categories">{categories.map(({ name, icon: Icon }, i) => <button key={name} className={"category-card cat-" + i + (category === name ? " selected" : "")} onClick={() => setCategory(category === name ? "Tümü" : name)}><Icon size={30} /><b>{name}</b></button>)}<button className={"category-card cat-all" + (category === "Tümü" ? " selected" : "")} onClick={() => setCategory("Tümü")}><Layers size={30} /><b>Tümü</b></button></section>
        <section className="promo-grid"><article className="promo promo-main"><Image src={logo} alt="CNR Müzik TV" width={260} height={88} unoptimized /><b>TÜRKİYE'NİN MÜZİK TELEVİZYONU</b></article><article className="promo promo-studio"><span>✦　CNR MÜZİK　✦</span><b>STÜDYOLARI</b><small>ÖZEL YAYINLAR</small></article><article className="promo promo-mic"><Mic2 size={56} /><b>MÜZİĞİN<br />EKRANDAKİ ADRESİ</b></article></section>

        <section className="content-section" id="videos"><div className="content-title"><span>SEÇKİLİ KLİPLER</span><h2><MonitorPlay size={20} /> {category === "Tümü" ? "ÖNE ÇIKAN KLİPLER" : category.toLocaleUpperCase("tr-TR")}</h2></div><div className="video-grid">{filtered.map((clip) => <button key={clip.id} className={"video-card " + (clip.id === current.id ? "selected" : "")} onClick={() => selectClip(clips.findIndex((v) => v.id === clip.id), true)}><span className="video-thumb"><Image src={thumb(clip.id)} alt={clip.title} width={320} height={180} unoptimized /><i><Play fill="currentColor" /></i><small>HD</small></span><b>{clip.artist}</b><span>{clip.title}</span></button>)}</div></section>

        <section className="content-section" id="artists"><div className="content-title"><span>SAHNE IŞIKLARI</span><h2><Activity size={20} /> SANATÇILAR</h2></div><div className="artist-row">{clips.slice(0, 5).map((clip) => <button key={clip.artist} onClick={() => selectClip(clips.findIndex((v) => v.id === clip.id), true)}><Image src={thumb(clip.id, "mqdefault")} alt="" width={72} height={48} unoptimized /><span><b>{clip.artist}</b><small>{clip.category}</small></span><ChevronRight size={16} /></button>)}</div></section>

        <section className="ticker" id="news"><b><Signal size={15} /> CNR'DEN HABERLER</b><div><span>CNR Müzik TV® ekranlarında yeni klipler, özel programlar ve müzik dünyasından gelişmeler!　•　Müzik hiç durmasın!　•　CNR Müzik Yapım® özel yayınları yakında...</span></div><nav><a href="https://youtube.com/@memetcinar444" target="_blank" rel="noreferrer"><Youtube /></a><a href="https://instagram.com/memetcinarofficial" target="_blank" rel="noreferrer"><Instagram /></a><a href="https://open.spotify.com" target="_blank" rel="noreferrer"><Disc3 /></a></nav></section>
        <footer>© 2026 <b>CNR Müzik Yapım®</b> · CNR Müzik TV® · TÜM HAKLARI SAKLIDIR.</footer>
      </section>
    </div>
    <nav className="mobile-dock">{menu.slice(0, 4).map(([label, Icon, id]) => <button key={id} onClick={() => go(id)}><Icon size={19} /><span>{id === "lists" ? "Listeler" : label}</span></button>)}<button onClick={() => notify("CNR Müzik TV resmi kanal.")}><Activity size={19} /><span>Profil</span></button></nav>

    {searchOpen && <div className="search-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}><div className="search-dialog"><div><b><Search size={18} /> CNR'DE ARA</b><button onClick={() => setSearchOpen(false)}><X /></button></div><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sanatçı, şarkı veya kategori ara..." /><div className="search-results">{clips.filter((clip) => (clip.title + " " + clip.artist + " " + clip.category).toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))).map((clip) => <button key={clip.id} onClick={() => { selectClip(clips.findIndex((v) => v.id === clip.id), true); setSearchOpen(false); }}><Image src={thumb(clip.id, "mqdefault")} alt="" width={64} height={42} unoptimized /><span><b>{clip.title}</b><small>{clip.artist}</small></span><ChevronRight /></button>)}</div></div></div>}
    {notice && <div className="toast" role="status">{notice}</div>}
    <a className="youtube-link" href={"https://www.youtube.com/watch?v=" + current.id} target="_blank" rel="noreferrer">YouTube'da aç <ChevronRight size={13} /></a>
  </main>;
}
