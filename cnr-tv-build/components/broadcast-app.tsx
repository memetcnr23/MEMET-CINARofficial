"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowUpRight, Bell, CalendarDays, CalendarRange, Camera, Check,
  ChevronDown, ChevronRight, Clock3, Disc3, ExternalLink, Expand, Heart,
  Home, Info, ListMusic, Menu, Mic2, MonitorPlay, Music2, Newspaper, Play,
  Radio, Search, Settings, Share2, Signal, Sparkles, Trophy, UserCircle2,
  Users, Volume2, VolumeX, X
} from "lucide-react";

type Clip = {
  id: string;
  title: string;
  artist: string;
  category: string;
  durationSeconds: number;
};
type TimedClip = {
  clip: Clip;
  startsAt: string;
  endsAt: string;
  offsetSeconds: number;
};
type NowPlaying = {
  source: string;
  serverTime: string;
  current: TimedClip;
  upcoming: TimedClip[];
  clips: Clip[];
  playlistDurationSeconds: number;
};
type YTPlayer = {
  loadVideoById: (value: string | { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (value: string | { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};
type YTReadyEvent = { target: YTPlayer };
type YTStateEvent = { data: number };
declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: {
        videoId: string;
        playerVars?: Record<string, string | number>;
        events?: {
          onReady?: (event: YTReadyEvent) => void;
          onStateChange?: (event: YTStateEvent) => void;
          onError?: () => void;
        };
      }) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const LOGO = "/cnr-logo.webp";
const navItems = [
  { label: "Ana Sayfa", href: "/", icon: Home },
  { label: "Canlı Yayın", href: "/canli-yayin", icon: Radio },
  { label: "Yayın Akışı", href: "/yayin-akisi", icon: CalendarDays },
  { label: "Programlar", href: "/programlar", icon: LayersIcon },
  { label: "Müzik Listeleri", href: "/muzik-listeleri", icon: ListMusic },
  { label: "Sanatçılar", href: "/sanatcilar", icon: Users },
  { label: "Klip Arşivi", href: "/klip-arsivi", icon: Disc3 },
  { label: "Haberler", href: "/haberler", icon: Newspaper },
  { label: "Etkinlikler", href: "/etkinlikler", icon: CalendarRange },
  { label: "Hakkımızda", href: "/hakkimizda", icon: Info },
  { label: "Profil & Ayarlar", href: "/profil", icon: UserCircle2 }
];
function LayersIcon(props: React.ComponentProps<typeof Activity>) { return <Activity {...props} />; }

const categoryNames = ["Tümü", "Türkçe Pop", "Rap & Trap", "Pop & Dans", "Akustik", "Efkar", "Top 20"];
const programNames = [
  { title: "CNR Station Deck", subtitle: "Gün boyu müzik kuşağı", time: "Kesintisiz", category: "Türkçe Pop", tone: "red" },
  { title: "Türkçe Pop Hits", subtitle: "En sevilen klipler", time: "14:00", category: "Türkçe Pop", tone: "pink" },
  { title: "CNR Top 20", subtitle: "Haftanın listesi", time: "16:00", category: "Top 20", tone: "gold" },
  { title: "Yeni Çıkanlar", subtitle: "Klip prömiyerleri", time: "18:00", category: "Pop & Dans", tone: "violet" },
  { title: "Efkar Gecesi", subtitle: "Duygusal şarkılar", time: "20:00", category: "Efkar", tone: "blue" },
  { title: "Akustik Sahne", subtitle: "Sade ve canlı performanslar", time: "22:00", category: "Akustik", tone: "silver" }
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
function durationText(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return Math.floor(safe / 60) + ":" + String(safe % 60).padStart(2, "0");
}
function thumb(id: string, quality = "hqdefault") {
  return "https://i.ytimg.com/vi/" + id + "/" + quality + ".jpg";
}
function pageTitle(path: string) {
  const match = navItems.find((item) => item.href === path);
  if (match) return match.label;
  if (path === "/sanatci/memet-cinar") return "Sanatçı Profili";
  return "CNR Müzik TV";
}
function getProgramName(category: string) {
  if (category === "Rap & Trap") return "CNR Rap & Trap";
  if (category === "Pop & Dans") return "Pop & Dans";
  if (category === "Akustik") return "Akustik Sahne";
  if (category === "Efkar") return "Efkar Gecesi";
  return category === "Top 20" ? "CNR Top 20" : "Türkçe Pop Hits";
}

export default function BroadcastApp() {
  const pathnameRaw = usePathname() || "/";
  const pathname = pathnameRaw.replace(/\/+$/, "") || "/";
  const router = useRouter();
  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);
  const loadedVideoRef = useRef("");
  const nowRef = useRef<NowPlaying | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [muted, setMuted] = useState(true);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [scheduleTab, setScheduleTab] = useState("Bugün");
  const [profileTab, setProfileTab] = useState("Hesabım");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [fullScreen, setFullScreen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lowerKey, setLowerKey] = useState(0);
  const [clock, setClock] = useState(new Date());

  const clips = nowPlaying?.clips || [];
  const current = nowPlaying?.current.clip;
  nowRef.current = nowPlaying;

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      try {
        const response = await fetch("/api/now-playing", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Yayın bilgisi alınamadı.");
        if (cancelled) return;
        setNowPlaying(data as NowPlaying);
        setCatalogError("");
      } catch (error) {
        if (!cancelled) setCatalogError(error instanceof Error ? error.message : "Yayın sunucusuna bağlanılamadı.");
      }
    };
    void update();
    const timer = window.setInterval(update, 12000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("cnr-favorites") || "[]"));
      setDarkMode(localStorage.getItem("cnr-dark-mode") !== "false");
      setSoundEnabled(localStorage.getItem("cnr-sound") === "true");
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/canli-yayin" || !nowPlaying?.current.clip) return;
    let disposed = false;
    const active = nowPlaying.current.clip;
    const init = () => {
      if (disposed || !window.YT?.Player || playerRef.current) return;
      const data = nowRef.current;
      const currentItem = data?.current;
      if (!currentItem) return;
      playerRef.current = new window.YT.Player("cnr-live-player", {
        videoId: currentItem.clip.id,
        playerVars: {
          autoplay: 1, controls: 0, disablekb: 1, rel: 0, playsinline: 1,
          fs: 0, iv_load_policy: 3, enablejsapi: 1, origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            playerReadyRef.current = true;
            loadedVideoRef.current = currentItem.clip.id;
            event.target.mute();
            setMuted(true);
            const elapsed = Math.max(0, (Date.now() - Date.parse(data?.serverTime || new Date().toISOString())) / 1000);
            event.target.seekTo(currentItem.offsetSeconds + elapsed, true);
            event.target.playVideo();
            setPlayerReady(true);
          },
          onStateChange: (event) => {
            const states = window.YT?.PlayerState;
            if (!states) return;
            setPlayerPlaying(event.data === states.PLAYING);
          },
          onError: () => notify("Bu klip oynatılamadı. Yayın sırası korunuyor; sıradaki senkron kontrol devam edecek.")
        }
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.querySelector('script[data-cnr-yt-api="true"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.dataset.cnrYtApi = "true";
        script.onerror = () => notify("YouTube oynatıcı servisi yüklenemedi.");
        document.head.appendChild(script);
      }
    }
    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      playerReadyRef.current = false;
      loadedVideoRef.current = "";
      setPlayerReady(false);
      setPlayerPlaying(false);
    };
  }, [pathname === "/canli-yayin", Boolean(nowPlaying?.current.clip?.id)]);

  useEffect(() => {
    if (pathname !== "/canli-yayin" || !playerReadyRef.current) return;
    const sync = () => {
      const data = nowRef.current;
      const item = data?.current;
      const player = playerRef.current;
      if (!item || !player || !playerReadyRef.current) return;
      const age = Math.max(0, (Date.now() - Date.parse(data.serverTime)) / 1000);
      const target = Math.max(0, item.offsetSeconds + age);
      if (loadedVideoRef.current !== item.clip.id) {
        loadedVideoRef.current = item.clip.id;
        player.loadVideoById({ videoId: item.clip.id, startSeconds: target });
        return;
      }
      const actual = player.getCurrentTime();
      if (Number.isFinite(actual) && Math.abs(actual - target) > 3.2) player.seekTo(target, true);
      if (player.getPlayerState() !== 1 && player.getPlayerState() !== 3) player.playVideo();
    };
    sync();
    const timer = window.setInterval(sync, 12000);
    return () => window.clearInterval(timer);
  }, [pathname, nowPlaying?.current.clip.id]);

  useEffect(() => {
    const onFullscreen = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    if (nowPlaying?.current.clip.id) setLowerKey((v) => v + 1);
  }, [nowPlaying?.current.clip.id]);

  const filteredClips = useMemo(() => clips.filter((clip) => {
    const categoryMatches = selectedCategory === "Tümü" || selectedCategory === "Top 20" || clip.category === selectedCategory;
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    return categoryMatches && (!query || (clip.title + " " + clip.artist + " " + clip.category).toLocaleLowerCase("tr-TR").includes(query));
  }), [clips, selectedCategory, searchQuery]);

  const uniqueArtists = useMemo(() => {
    const seen = new Set<string>();
    return clips.filter((clip) => {
      const key = clip.artist.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [clips]);

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) {
      setMuted((value) => !value);
      setSoundEnabled((value) => !value);
      notify("Ses tercihi kaydedildi. Yayın oynatıcı hazır olduğunda uygulanacak.");
      return;
    }
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
      setSoundEnabled(true);
      localStorage.setItem("cnr-sound", "true");
    } else {
      player.mute();
      setMuted(true);
      setSoundEnabled(false);
      localStorage.setItem("cnr-sound", "false");
    }
  };

  const startWithSound = () => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) {
      notify("Canlı yayın hazırlanıyor. Birkaç saniye sonra tekrar deneyin.");
      return;
    }
    player.unMute();
    player.playVideo();
    setMuted(false);
    setSoundEnabled(true);
    localStorage.setItem("cnr-sound", "true");
  };

  const toggleFullscreen = async () => {
    const element = document.querySelector(".live-screen") as HTMLElement | null;
    if (!element) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      notify("Tam ekran açılamadı. Tarayıcı iznini kontrol edin.");
    }
  };

  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("cnr-favorites", JSON.stringify(updated));
    notify(updated.includes(id) ? "Favorilerinize eklendi." : "Favorilerden çıkarıldı.");
  };

  const sharePage = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "CNR Müzik TV", text: "CNR Müzik TV — Türkiye'nin müzik televizyonu", url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        notify("Sayfa bağlantısı kopyalandı.");
      }
    } catch {
      notify("Paylaşım açılamadı.");
    }
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("cnr-dark-mode", String(next));
  };

  const closeMobileMenu = () => setMobileMenu(false);
  const h = clock.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const renderClipCard = (clip: Clip, index: number) => (
    <article className="clip-card" key={clip.id}>
      <a className="clip-picture" href={"https://www.youtube.com/watch?v=" + clip.id} target="_blank" rel="noreferrer">
        <Image src={thumb(clip.id)} alt={clip.title} width={420} height={236} unoptimized />
        <span className="clip-play"><Play size={18} fill="currentColor" /></span>
        <span className="clip-hd">HD</span>
        <span className="clip-duration">{durationText(clip.durationSeconds)}</span>
      </a>
      <div className="clip-info">
        <div><small>{clip.category}</small><a href={"https://www.youtube.com/watch?v=" + clip.id} target="_blank" rel="noreferrer"><b>{clip.title}</b></a><span>{clip.artist}</span></div>
        <button className={favorites.includes(clip.id) ? "icon-action favourite active" : "icon-action favourite"} onClick={() => toggleFavorite(clip.id)} aria-label="Favorilere ekle"><Heart size={17} fill={favorites.includes(clip.id) ? "currentColor" : "none"} /></button>
      </div>
    </article>
  );

  const pageHeading = (eyebrow: string, title: string, subtitle: string) => (
    <div className="page-heading">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>
      <span className="heading-mark"><Activity size={26} /></span>
    </div>
  );

  let content: React.ReactNode;

  if (pathname === "/canli-yayin") {
    content = <>
      {pageHeading("CNR MÜZİK TV · ON AIR", "Canlı Yayın", "Bütün cihazlar aynı yayın çizelgesine ve aynı klip zamanına bağlanır.")}
      <section className="live-broadcast-layout">
        <div className="live-primary">
          <div className="live-screen">
            <div className="screen-top"><span className="live-dot"><i /> CANLI</span><span className="screen-quality">CNR MÜZİK TV · HD</span></div>
            <div id="cnr-live-player" className="youtube-video-host" />
            {!playerPlaying && <button className="screen-start" onClick={startWithSound}><Play fill="currentColor" size={19} /> YAYINI BAŞLAT</button>}
            <div className="screen-bottom"><span>● SİNYAL AKTİF</span><span>{h}</span></div>
          </div>
          <div className="broadcast-controls">
            <button className="control-live" onClick={() => { const p = playerRef.current; if (p) { p.playVideo(); notify("Canlı yayına yeniden bağlandınız."); } }}><Radio size={16} /> CANLIYA DÖN</button>
            <div className="control-spacer" />
            <span className="sync-label"><span /> SENKRON YAYIN</span>
            <button className="player-button" onClick={toggleMute} aria-label={muted ? "Sesi aç" : "Sesi kapat"}>{muted ? <VolumeX /> : <Volume2 />}</button>
            <button className="player-button" onClick={toggleFullscreen} aria-label="Tam ekran">{fullScreen ? <X /> : <Expand />}</button>
          </div>
          <div className="lower-third-panel" key={lowerKey}>
            <div className="lower-live-label"><span /> ŞİMDİ YAYINDA</div>
            <div className="lower-track">
              <Image src={LOGO} alt="" width={115} height={39} unoptimized />
              <div><b>{current?.title || "Yayın hazırlanıyor"}</b><small>{current?.artist || "CNR Müzik TV"} · {current?.category || "Müzik Kuşağı"}</small></div>
            </div>
            <div className="lower-bars">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ animationDelay: (i * 0.07) + "s" }} />)}</div>
          </div>
        </div>
        <aside className="live-side-panel">
          <div className="panel-heading"><div><span className="eyebrow">ŞU ANDA</span><h2>Yayında</h2></div><span className="live-chip">CANLI</span></div>
          {current && <div className="now-playing-card"><Image src={thumb(current.id)} alt={current.title} width={400} height={225} unoptimized /><div><small>{getProgramName(current.category)}</small><b>{current.title}</b><span>{current.artist}</span></div></div>}
          <div className="live-status-grid"><div><span>Yayın durumu</span><b><i /> AKTİF</b></div><div><span>Oynatıcı</span><b>{playerReady ? "HAZIR" : "BAĞLANIYOR"}</b></div></div>
          <div className="panel-heading upcoming-heading"><div><span className="eyebrow">SIRADAKİ</span><h2>Yayın Akışı</h2></div><Link href="/yayin-akisi">Tümü <ChevronRight size={15} /></Link></div>
          <div className="upcoming-list">{(nowPlaying?.upcoming || []).slice(1, 6).map((item) => <div className="upcoming-row" key={item.clip.id + item.startsAt}><Image src={thumb(item.clip.id, "mqdefault")} alt="" width={88} height={50} unoptimized /><span className="upcoming-time">{formatTime(item.startsAt)}</span><div><b>{item.clip.title}</b><small>{getProgramName(item.clip.category)}</small></div></div>)}</div>
          {catalogError && <p className="error-note">{catalogError}</p>}
          <button className="secondary-wide" onClick={sharePage}><Share2 size={16} /> YAYINI PAYLAŞ</button>
        </aside>
      </section>
      <p className="broadcast-disclaimer">Senkronizasyon, sunucu saatine göre sağlanır. YouTube üzerinden oynatılan kliplerde YouTube'un kendi marka öğeleri bulunabilir; tamamen özel oynatıcı görünümü için lisanslı master dosyaların HLS yayını gerekir.</p>
    </>;
  } else if (pathname === "/yayin-akisi") {
    const upcoming = nowPlaying?.upcoming || [];
    content = <>
      {pageHeading("PROGRAMLAMA", "Yayın Akışı", "CNR Müzik TV ekranlarında sırada ne var? Ortak yayın çizelgesi tüm cihazlarda aynıdır.")}
      <div className="schedule-toolbar">
        <div className="segmented-tabs">{["Bugün", "Yarın", "Bu Hafta"].map((tab) => <button key={tab} className={scheduleTab === tab ? "selected" : ""} onClick={() => setScheduleTab(tab)}>{tab}</button>)}</div>
        <span className="timezone"><Clock3 size={15} /> Türkiye saati · {h}</span>
      </div>
      {scheduleTab === "Bugün" ? <div className="timeline-list">{upcoming.map((item, i) => <article className={i === 0 ? "timeline-row is-now" : "timeline-row"} key={item.clip.id + item.startsAt}><div className="timeline-time"><b>{formatTime(item.startsAt)}</b><small>{i === 0 ? "ŞİMDİ" : i === 1 ? "SONRA" : "SIRADA"}</small></div><Image src={thumb(item.clip.id, "mqdefault")} alt="" width={144} height={81} unoptimized /><div className="timeline-info"><span>{getProgramName(item.clip.category)}</span><b>{item.clip.title}</b><small>{item.clip.artist}</small></div><span className="timeline-length">{durationText(item.clip.durationSeconds)}</span></article>)}</div> : <div className="empty-state"><CalendarDays size={34} /><b>{scheduleTab} çizelgesi</b><span>Haftalık program planı yayın yönetim sistemine eklendikçe burada yayınlanacak.</span><button onClick={() => setScheduleTab("Bugün")}>Bugünkü akışa dön</button></div>}
    </>;
  } else if (pathname === "/programlar") {
    content = <>
      {pageHeading("CNR PROGRAMLARI", "Programlar", "Müziğin farklı renklerini bir araya getiren CNR Müzik TV kuşakları.")}
      <div className="program-grid">{programNames.map((program, i) => <article className={"program-card tone-" + program.tone} key={program.title}><div className="program-art"><span>{String(i + 1).padStart(2, "0")}</span><div className="program-symbol">{i === 0 ? <Radio /> : i === 1 ? <Mic2 /> : i === 2 ? <Trophy /> : i === 3 ? <Sparkles /> : i === 4 ? <Heart /> : <Guitar />}</div><b>{program.title}</b></div><div className="program-info"><div><b>{program.title}</b><small>{program.subtitle}</small></div><span>{program.time}</span></div><button onClick={() => router.push("/yayin-akisi")}>Yayın akışını gör <ChevronRight size={15} /></button></article>)}</div>
    </>;
  } else if (pathname === "/muzik-listeleri") {
    content = <>
      {pageHeading("MÜZİK KEŞFİ", "Müzik Listeleri", "Tarzını seç, CNR Müzik TV seçkisinde yeni favorilerini keşfet.")}
      <div className="filter-chips">{categoryNames.map((name) => <button key={name} className={selectedCategory === name ? "active" : ""} onClick={() => setSelectedCategory(name)}>{name}</button>)}</div>
      <div className="list-feature"><div className="list-feature-copy"><span className="eyebrow">HAFTANIN SEÇKİSİ</span><h2>CNR TOP 20</h2><p>Bu haftanın öne çıkan müzik videoları ve yeni keşifler.</p><button onClick={() => { setSelectedCategory("Top 20"); router.push("/klip-arsivi"); }}>Listeyi keşfet <ArrowUpRight size={16} /></button></div><div className="list-feature-visual"><Trophy size={72} /><strong>TOP<br />20</strong></div></div>
      <div className="section-title-row"><div><span className="eyebrow">GÜNCEL SEÇKİ</span><h2>{selectedCategory === "Tümü" ? "Öne Çıkan Klipler" : selectedCategory}</h2></div><span className="result-count">{filteredClips.length} KLİP</span></div>
      <div className="clip-grid">{filteredClips.slice(0, 12).map(renderClipCard)}</div>
    </>;
  } else if (pathname === "/sanatcilar") {
    content = <>
      {pageHeading("SAHNE IŞIKLARI", "Sanatçılar", "CNR Müzik TV ekranında yer alan sanatçı ve müzik kanallarını keşfet.")}
      <div className="artist-feature"><div className="artist-feature-image"><Image src={current ? thumb(current.id, "maxresdefault") : LOGO} alt="" fill unoptimized /></div><div><span className="eyebrow">CNR MÜZİK YAPIM SANATÇISI</span><h2>MEMET ÇINAR</h2><p>Türkçe pop, pop-rap ve melodik müzik dünyasından seçkiler.</p><Link href="/sanatci/memet-cinar" className="red-link">Sanatçı profilini aç <ChevronRight size={16} /></Link></div></div>
      <div className="section-title-row"><div><span className="eyebrow">YOUTUBE KANALLARI</span><h2>Yayın Kataloğundaki Sanatçılar</h2></div><span className="result-count">{uniqueArtists.length} KANAL</span></div>
      <div className="artist-grid">{uniqueArtists.map((clip) => <a className="artist-card" key={clip.artist} href={"https://www.youtube.com/results?search_query=" + encodeURIComponent(clip.artist + " resmi müzik")} target="_blank" rel="noreferrer"><Image src={thumb(clip.id, "mqdefault")} alt="" width={100} height={100} unoptimized /><b>{clip.artist}</b><small>{clip.category}</small><span><ExternalLink size={14} /> Kanalı keşfet</span></a>)}</div>
    </>;
  } else if (pathname === "/sanatci/memet-cinar") {
    content = <>
      {pageHeading("ARTIST PROFILE", "Memet Çınar", "Sanatçı sayfası · CNR Müzik Yapım®")}
      <section className="artist-profile">
        <div className="artist-profile-cover">{current && <Image src={thumb(current.id, "maxresdefault")} alt="" fill unoptimized />}</div>
        <div className="artist-profile-main"><div className="avatar">MC</div><div><span className="verified">✓ DOĞRULANMIŞ SANATÇI</span><h2>MEMET ÇINAR</h2><p>Sanatçı · Türkçe Pop / Pop-Rap</p><div className="artist-stats"><span><b>{clips.length || "—"}</b>Yayın kataloğunda</span><span><b>CNR</b>Yapım şirketi</span></div></div><button onClick={sharePage}><Share2 size={16} /> Paylaş</button></div>
      </section>
      <div className="section-title-row"><div><span className="eyebrow">SANATÇI SEÇKİSİ</span><h2>Öne Çıkan Kayıtlar</h2></div></div>
      <div className="clip-grid">{clips.slice(0, 8).map(renderClipCard)}</div>
      <div className="platform-links"><a href="https://youtube.com/@memetcinar444" target="_blank" rel="noreferrer">YouTube <ExternalLink size={14} /></a><a href="https://open.spotify.com" target="_blank" rel="noreferrer">Spotify <ExternalLink size={14} /></a><a href="https://instagram.com/memetcinarofficial" target="_blank" rel="noreferrer">Instagram <ExternalLink size={14} /></a></div>
    </>;
  } else if (pathname === "/klip-arsivi") {
    content = <>
      {pageHeading("VIDEO LIBRARY", "Klip Arşivi", "Yayın kataloğundaki klipleri türüne, sanatçıya veya adına göre bul.")}
      <div className="archive-toolbar"><div className="archive-search"><Search size={17} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Klip veya sanatçı ara..." /></div><span className="result-count">{filteredClips.length} SONUÇ</span></div>
      <div className="filter-chips">{categoryNames.map((name) => <button key={name} className={selectedCategory === name ? "active" : ""} onClick={() => setSelectedCategory(name)}>{name}</button>)}</div>
      {filteredClips.length ? <div className="clip-grid archive-grid">{filteredClips.map(renderClipCard)}</div> : <div className="empty-state"><Search size={34} /><b>Aradığın klip bulunamadı</b><span>Başka bir sanatçı veya kategori deneyebilirsin.</span><button onClick={() => { setSearchQuery(""); setSelectedCategory("Tümü"); }}>Filtreleri temizle</button></div>}
    </>;
  } else if (pathname === "/haberler") {
    content = <>
      {pageHeading("CNR NEWSROOM", "Haberler", "CNR Müzik TV ve müzik dünyasından duyurular.")}
      <div className="news-feature"><div className="news-visual"><Image src={LOGO} alt="CNR Müzik TV" width={320} height={108} unoptimized /><span>ÖZEL DUYURU</span></div><div className="news-copy"><span className="eyebrow">CNR MÜZİK TV</span><h2>Türkiye'nin Müzik Televizyonu</h2><p>CNR Müzik TV yayın kataloğu ve program akışı güncelleniyor. Yeni klipler ve özel kuşaklar için bizi takipte kal.</p><Link href="/canli-yayin" className="red-link">Canlı yayına geç <ChevronRight size={16} /></Link></div></div>
      <div className="news-note"><Bell size={20} /><div><b>Yeni duyurular burada yayınlanacak</b><span>Resmî haberler eklendiğinde bu bölüm güncel içerikle yenilenecek.</span></div></div>
    </>;
  } else if (pathname === "/etkinlikler") {
    content = <>
      {pageHeading("CNR EVENTS", "Etkinlikler", "Özel yayınlar, müzik buluşmaları ve CNR etkinlik takvimi.")}
      <div className="event-banner"><div className="event-sparks">✦　✦　✦</div><span className="eyebrow">CNR ASSOCIATION · CNR MÜZİK YAPIM</span><h2>GALA & MÜZİK ÖDÜLLERİ</h2><p>Özel etkinlik ve yayın duyuruları bu alanda paylaşılacak.</p><button onClick={() => notify("Etkinlik takvimi güncellendiğinde burada duyurulacak.")}>Duyuruları görüntüle <ChevronRight size={16} /></button></div>
      <div className="empty-state compact"><CalendarDays size={32} /><b>Yaklaşan etkinlik bulunmuyor</b><span>Yeni etkinlik tarihleri açıklandığında takvime eklenecek.</span></div>
    </>;
  } else if (pathname === "/hakkimizda") {
    content = <>
      {pageHeading("OUR STORY", "Hakkımızda", "Müziğin ekranla buluştuğu yer.")}
      <div className="about-hero"><Image src={LOGO} alt="CNR Müzik TV" width={340} height={116} unoptimized /><h2>Türkiye'nin Müzik Televizyonu</h2><p>CNR Müzik TV; müzik, eğlence ve sanat dünyasını 7/24 tek ekranda buluşturmayı hedefleyen dijital müzik kanalıdır. Yerli ve ulusal sanatçılara, yeni yeteneklere ve müzik kültürüne destek olmayı amaçlar.</p></div>
      <div className="about-metrics"><div><Radio /><b>7/24</b><span>Yayın hedefi</span></div><div><MonitorPlay /><b>{clips.length || "—"}</b><span>Klip kataloğu</span></div><div><Users /><b>CNR</b><span>Müzik Yapım</span></div><div><Signal /><b>Türkiye</b><span>Dijital yayın</span></div></div>
    </>;
  } else if (pathname === "/profil") {
    content = <>
      {pageHeading("PERSONAL SPACE", "Profil & Ayarlar", "CNR Müzik TV deneyimini düzenle.")}
      <div className="profile-card"><div className="profile-avatar">MC</div><div><span className="verified">✓ SANATÇI PROFİLİ</span><h2>Memet Çınar</h2><p>@memetcinarofficial · CNR Müzik Yapım®</p></div><Link href="/sanatci/memet-cinar" className="profile-edit">Profili Görüntüle <ChevronRight size={15} /></Link></div>
      <div className="profile-tabs">{["Hesabım", "Listelerim", "Ayarlar"].map((tab) => <button key={tab} className={profileTab === tab ? "active" : ""} onClick={() => setProfileTab(tab)}>{tab}</button>)}</div>
      {profileTab === "Hesabım" && <div className="settings-list"><button onClick={() => router.push("/sanatci/memet-cinar")}><UserCircle2 /><span><b>Sanatçı profilim</b><small>Herkese açık profilini görüntüle</small></span><ChevronRight /></button><button onClick={() => notify("Hesap ayrıntıları CNR üyelik sistemi bağlandığında açılacak.")}><Settings /><span><b>Hesap bilgileri</b><small>Üyelik ve iletişim ayarları</small></span><ChevronRight /></button></div>}
      {profileTab === "Listelerim" && <><div className="section-title-row"><div><span className="eyebrow">KİŞİSEL KOLEKSİYON</span><h2>Favori Kliplerim</h2></div><span className="result-count">{favorites.length} KAYIT</span></div><div className="clip-grid">{clips.filter((clip) => favorites.includes(clip.id)).map(renderClipCard)}</div>{favorites.length === 0 && <div className="empty-state compact"><Heart size={30} /><b>Henüz favorin yok</b><span>Klip arşivinden beğendiğin kayıtları favorilerine ekle.</span><Link href="/klip-arsivi">Klip arşivine git</Link></div>}</>}
      {profileTab === "Ayarlar" && <div className="settings-list"><button onClick={toggleDark}><span className="settings-icon"><Sparkles /></span><span><b>Karanlık Mod</b><small>Arayüz temasını değiştir</small></span><span className={darkMode ? "toggle on" : "toggle"} /></button><button onClick={() => { const n = !soundEnabled; setSoundEnabled(n); localStorage.setItem("cnr-sound", String(n)); if (playerRef.current) n ? playerRef.current.unMute() : playerRef.current.mute(); setMuted(!n); }}><span className="settings-icon"><Volume2 /></span><span><b>Ses Tercihi</b><small>Yayın sesini aç veya kapat</small></span><span className={soundEnabled ? "toggle on" : "toggle"} /></button><button onClick={() => notify("Bildirim tercihleri kaydedildi.")}><span className="settings-icon"><Bell /></span><span><b>Bildirimler</b><small>Program ve yayın duyuruları</small></span><span className="toggle on" /></button></div>}
    </>;
  } else {
    const heroClip = current || clips[0];
    content = <>
      <section className="home-hero">
        <div className="hero-main">
          <div className="hero-image">{heroClip && <Image src={thumb(heroClip.id, "maxresdefault")} alt={heroClip.title} fill unoptimized />}</div>
          <div className="hero-shade" />
          <div className="hero-content"><span className="hero-tag"><i /> YENİ KLİP · CNR SEÇKİSİ</span><h1>{heroClip?.artist || "MEMET ÇINAR"}</h1><p>{heroClip?.title || "Müzik hiç durmasın."}</p><Link href="/canli-yayin" className="hero-play"><Play fill="currentColor" size={17} /> CANLI YAYINI İZLE</Link><div className="hero-pagination"><i className="active" /><i /><i /></div></div>
          <div className="hero-arrow"><ChevronRight /></div>
        </div>
        <div className="hero-side">
          <div className="mini-live-card"><div className="mini-live-art"><Image src={LOGO} alt="" width={180} height={62} unoptimized /><span className="live-chip"><i /> CANLI</span></div><div className="mini-live-copy"><b>CNR Müzik TV · Canlı Yayın</b><span>Türkiye'nin müzik televizyonu</span><Link href="/canli-yayin">Yayına bağlan <ArrowUpRight size={15} /></Link></div></div>
          <div className="mini-event-card"><span className="eyebrow">CNR PROGRAMLARI</span><b>EFKAR GECESİ</b><span>Melodik ve duygusal seçki</span><Link href="/programlar">Programları keşfet <ChevronRight size={14} /></Link></div>
        </div>
      </section>
      <section className="quick-categories"><div className="section-title-row"><div><span className="eyebrow">TARZINI SEÇ</span><h2>Kategoriler</h2></div><Link href="/muzik-listeleri">Tüm listeler <ChevronRight size={15} /></Link></div><div className="category-grid">{categoryNames.slice(1).map((name, i) => <button className={"category-tile cat-color-" + i} key={name} onClick={() => { setSelectedCategory(name); router.push("/muzik-listeleri"); }}><span>{i === 0 ? <Mic2 /> : i === 1 ? <Activity /> : i === 2 ? <Disc3 /> : i === 3 ? <Heart /> : <Trophy />}</span><b>{name}</b><ChevronRight size={15} /></button>)}</div></section>
      <section className="home-section"><div className="section-title-row"><div><span className="eyebrow">ŞİMDİ YAYINDA</span><h2>Öne Çıkan Klipler</h2></div><Link href="/klip-arsivi">Klip arşivi <ChevronRight size={15} /></Link></div>{clips.length ? <div className="clip-grid">{clips.slice(0, 4).map(renderClipCard)}</div> : <div className="empty-state compact"><Radio size={28} /><b>{catalogError || "Yayın kataloğu yükleniyor"}</b><span>YouTube müzik kataloğu hazırlanıyor.</span></div>}</section>
      <section className="home-section"><div className="section-title-row"><div><span className="eyebrow">SAHNE IŞIKLARI</span><h2>Sanatçılar</h2></div><Link href="/sanatcilar">Tüm sanatçılar <ChevronRight size={15} /></Link></div><div className="artist-strip">{uniqueArtists.slice(0, 6).map((clip) => <a href={"https://www.youtube.com/results?search_query=" + encodeURIComponent(clip.artist)} target="_blank" rel="noreferrer" key={clip.artist}><Image src={thumb(clip.id, "mqdefault")} alt="" width={90} height={90} unoptimized /><b>{clip.artist}</b><small>{clip.category}</small></a>)}</div></section>
    </>;
  }

  const isHome = pathname === "/";
  return <div className={darkMode ? "tv-app" : "tv-app light-mode"}>
    <header className="top-header">
      <Link href="/" className="brand-lockup"><Image src={LOGO} alt="CNR Müzik TV" width={230} height={78} priority unoptimized /><span>TÜRKİYE'NİN MÜZİK TELEVİZYONU</span></Link>
      <div className="republic-banner"><Image src="/ataturk-flag.webp" alt="Atatürk ve Türk bayrağı" width={180} height={180} unoptimized priority /><span>CUMHURİYETİN IŞIĞINDA</span></div>
      <div className="header-tools"><div className="digital-clock"><b>{h}</b><span>{clock.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</span></div><button className="header-icon" onClick={() => setSearchOpen(true)} aria-label="Ara"><Search /></button><div className="notification-wrap"><button className="header-icon" onClick={() => setNotificationsOpen((v) => !v)} aria-label="Bildirimler"><Bell /><i /></button>{notificationsOpen && <div className="notification-popover"><b>CNR Bildirimleri</b><p>Yeni program ve klip duyuruları burada görünecek.</p><button onClick={() => setNotificationsOpen(false)}>Tamam</button></div>}</div><Link href="/profil" className="header-icon" aria-label="Profil"><UserCircle2 /></Link></div>
    </header>
    <div className="mobile-titlebar"><button onClick={() => setMobileMenu((v) => !v)} aria-label="Menüyü aç"><Menu /></button><Link href="/"><Image src={LOGO} alt="CNR Müzik TV" width={154} height={52} unoptimized /></Link><button onClick={() => setSearchOpen(true)} aria-label="Ara"><Search /></button></div>
    <div className="app-frame">
      <aside className={mobileMenu ? "side-nav mobile-open" : "side-nav"}>
        <div className="sidebar-top"><span>MENÜ</span><button onClick={closeMobileMenu}><X size={16} /></button></div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return <Link href={item.href} key={item.href} onClick={closeMobileMenu} className={pathname === item.href || (item.href === "/sanatcilar" && pathname.startsWith("/sanatci/")) ? "nav-link active" : "nav-link"}><Icon size={17} /><span>{item.label}</span>{pathname === item.href && <i />}</Link>;
        })}
        <div className="sidebar-live"><span className="live-dot"><i /> ON AIR</span><b>{current?.title || "CNR Müzik TV"}</b><small>{current?.artist || "Müzik yayını"}</small><Link href="/canli-yayin">Yayını aç <ArrowUpRight size={14} /></Link></div>
        <div className="sidebar-footer"><span>© 2026 CNR MÜZİK YAPIM®</span><span>VERSION 2.0 · LIVE</span></div>
      </aside>
      <main className="page-area">
        <div className="page-topline"><div className="breadcrumb"><Link href="/">CNR MÜZİK TV</Link><ChevronRight size={13} /><span>{pageTitle(pathname)}</span></div><div className="topline-right"><span><i /> YAYIN SİSTEMİ AKTİF</span><button onClick={sharePage}><Share2 size={15} /> Paylaş</button></div></div>
        {content}
        <footer className="site-footer"><div><Image src={LOGO} alt="CNR Müzik TV" width={150} height={51} unoptimized /><span>Türkiye'nin Müzik Televizyonu</span></div><p>© 2026 CNR Müzik Yapım® · CNR Müzik TV® · Tüm hakları saklıdır.</p><div className="footer-social"><a href="https://youtube.com/@memetcinar444" target="_blank" rel="noreferrer"><MonitorPlay /></a><a href="https://instagram.com/memetcinarofficial" target="_blank" rel="noreferrer"><Camera /></a><a href="https://open.spotify.com" target="_blank" rel="noreferrer"><Music2 /></a></div></footer>
      </main>
    </div>
    <nav className="mobile-dock">{navItems.slice(0, 5).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}><Icon size={18} /><span>{item.label.split(" ")[0]}</span></Link>; })}</nav>
    {searchOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}><div className="search-modal"><div className="modal-head"><div><span className="eyebrow">CNR MUSIC SEARCH</span><b>Ne dinlemek istersin?</b></div><button onClick={() => setSearchOpen(false)}><X /></button></div><div className="modal-searchbox"><Search size={18} /><input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sanatçı, şarkı veya kategori ara..." /></div><div className="modal-results">{filteredClips.slice(0, 8).map((clip) => <a href={"https://www.youtube.com/watch?v=" + clip.id} target="_blank" rel="noreferrer" key={clip.id}><Image src={thumb(clip.id, "mqdefault")} alt="" width={72} height={46} unoptimized /><span><b>{clip.title}</b><small>{clip.artist}</small></span><ExternalLink size={15} /></a>)}</div></div></div>}
    {toast && <div className="toast-message" role="status"><Check size={17} /> {toast}</div>}
  </div>;
}