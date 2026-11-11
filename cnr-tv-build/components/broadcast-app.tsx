"use client";

import Image from "next/image";
import AdPlacement from "@/components/ad-placement";
import SponsorBand from "@/components/sponsor-band";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Activity, ArrowUpRight, BadgeCheck, Bell, CalendarDays, CalendarRange, Camera, Captions, Check,
  ChevronDown, ChevronRight, Clock3, Disc3, ExternalLink, Expand, Heart,
  Home, Info, ListMusic, Menu, Mic2, MonitorPlay, Music2, Newspaper, Pause, Play,
  Radio, Search, Settings, Share2, Signal, Sparkles, Trophy, UserCircle2,
  Users, Volume2, VolumeX, X, Guitar
} from "lucide-react";

type Clip = {
  id: string;
  title: string;
  artist: string;
  category: string;
  videoType?: string;
  durationSeconds: number;
  hlsUrl?: string | null;
};
type Artist={slug:string;name:string;genre?:string|null;bio?:string|null;avatar_url?:string|null;cover_url?:string|null;youtube_url?:string|null;instagram_url?:string|null;spotify_url?:string|null;is_verified:boolean;verification_source?:string|null};
type SearchResults={artists:Artist[];clips:Clip[];databaseConnected:boolean};
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
  getOptions?: (module?: string) => string[];
  getOption?: (module: string, option: string) => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
  setVolume?: (volume: number) => void;
  destroy: () => void;
};
type YTReadyEvent = { target: YTPlayer };
type YTStateEvent = { data: number };
type HlsErrorData = { fatal: boolean; type: string };
type HlsInstance = {
  loadSource: (src: string) => void;
  attachMedia: (media: HTMLMediaElement) => void;
  on: (event: string, callback: (event?: string, data?: HlsErrorData) => void) => void;
  startLoad: () => void;
  recoverMediaError: () => void;
  destroy: () => void;
};
type HlsConstructor = {
  new (options?: Record<string, unknown>): HlsInstance;
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
  ErrorTypes: { NETWORK_ERROR: string; MEDIA_ERROR: string };
};
declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: {
        videoId: string;
        playerVars?: Record<string, string | number>;
        events?: {
          onReady?: (event: YTReadyEvent) => void;
          onStateChange?: (event: YTStateEvent) => void;
          onApiChange?: (event: YTReadyEvent) => void;
          onError?: () => void;
        };
      }) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Hls?: HlsConstructor;
  }
}

const LOGO = "/cnr-logo.svg";
const HLS_STREAM = process.env.NEXT_PUBLIC_CNR_HLS_URL || "";
// Default: HLS per-clip when available, YouTube embed fallback otherwise.
// Set NEXT_PUBLIC_CNR_PLAYER_MODE=hls to enforce HLS-only mode.
// Always keep the YouTube fallback available when no HLS manifest is configured.
const HLS_ONLY = false;
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
  { label: "İstatistik Merkezi", href: "/istatistikler", icon: Activity },
  { label: "Hakkımızda", href: "/hakkimizda", icon: Info },
  { label: "Üye Hesabım", href: "/hesabim", icon: UserCircle2 },
];
function LayersIcon(props: React.ComponentProps<typeof Activity>) { return <Activity {...props} />; }

const categoryNames = ["Tümü", "Türkçe Pop", "Rap & Trap", "Pop & Dans", "K-Pop", "Global Pop", "Türkçe Rock & Arabesk", "Akustik", "Efkar", "Top 20"];
const programNames = [
  { title: "CNR Station Deck", subtitle: "Gün boyu müzik kuşağı", time: "Kesintisiz", category: "Türkçe Pop", tone: "red" },
  { title: "Türkçe Pop Hits", subtitle: "En sevilen klipler", time: "14:00", category: "Türkçe Pop", tone: "pink" },
  { title: "CNR Top 20", subtitle: "Haftanın listesi", time: "16:00", category: "Top 20", tone: "gold" },
  { title: "Yeni Çıkanlar", subtitle: "Klip prömiyerleri", time: "18:00", category: "Pop & Dans", tone: "violet" },
  { title: "K-Pop Zone", subtitle: "Kore pop müziği ve klipleri", time: "19:00", category: "K-Pop", tone: "violet" },
  { title: "Global Music", subtitle: "Dünyadan müzik videoları", time: "21:00", category: "Global Pop", tone: "blue" },
  { title: "Efkar Gecesi", subtitle: "Duygusal şarkılar", time: "20:00", category: "Efkar", tone: "blue" },
  { title: "Akustik Sahne", subtitle: "Sade ve canlı performanslar", time: "22:00", category: "Akustik", tone: "silver" }
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
type NationalDay = { month: number; day: number; label: string };

const nationalDays: NationalDay[] = [
  { month: 3, day: 18, label: "18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü" },
  { month: 4, day: 23, label: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı" },
  { month: 5, day: 19, label: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { month: 7, day: 15, label: "15 Temmuz Demokrasi ve Millî Birlik Günü" },
  { month: 8, day: 30, label: "30 Ağustos Zafer Bayramı" },
  { month: 10, day: 29, label: "29 Ekim Cumhuriyet Bayramı" },
  { month: 11, day: 10, label: "10 Kasım Atatürk'ü Anma Günü" }
];

function getActiveNationalDay(now: Date): NationalDay | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "numeric", day: "numeric"
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value || 0);
  const year = part("year");
  const todayUtc = Date.UTC(year, part("month") - 1, part("day"));
  let active: { day: NationalDay; distance: number } | null = null;

  for (const calendarYear of [year - 1, year, year + 1]) {
    for (const day of nationalDays) {
      const eventUtc = Date.UTC(calendarYear, day.month - 1, day.day);
      const distance = Math.round((eventUtc - todayUtc) / 86400000);
      if (distance >= -3 && distance <= 3 && (!active || Math.abs(distance) < Math.abs(active.distance))) {
        active = { day, distance };
      }
    }
  }
  return active?.day || null;
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
  if (path.startsWith("/sanatci/")) return "Sanatçı Profili";
  return "CNR Müzik TV";
}
function getProgramName(category: string) {
  if (category === "Rap & Trap") return "CNR Rap & Trap";
  if (category === "Pop & Dans") return "Pop & Dans";
  if (category === "K-Pop") return "K-Pop Zone";
  if (category === "Global Pop") return "Global Music";
  if (category === "Türkçe Rock & Arabesk") return "Türkçe Rock & Arabesk";
  if (category === "Akustik") return "Akustik Sahne";
  if (category === "Efkar") return "Efkar Gecesi";
  return category === "Top 20" ? "CNR Top 20" : "Türkçe Pop Hits";
}

export default function BroadcastApp() {
  const pathnameRaw = usePathname() || "/";
  const pathname = pathnameRaw.replace(/\/+$/, "") || "/";
  const router = useRouter();
  const playerRef = useRef<YTPlayer | null>(null);
  const hlsVideoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<{ destroy: () => void } | null>(null);
  const playerReadyRef = useRef(false);
  const loadedVideoRef = useRef("");
  const nowRef = useRef<NowPlaying | null>(null);
  const lowerWindowRef = useRef("");
  const transitionTimerRef = useRef<number | null>(null);
  const [videoTransitioning, setVideoTransitioning] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [directorySearch, setDirectorySearch] = useState("");
  const [artistDetail, setArtistDetail] = useState<Artist | null>(null);
  const [artistError, setArtistError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [muted, setMuted] = useState(true);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [selectedFormat, setSelectedFormat] = useState("Tümü");
  const [scheduleTab, setScheduleTab] = useState("Bugün");
  const [profileTab, setProfileTab] = useState("Hesabım");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [fullScreen, setFullScreen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lowerKey, setLowerKey] = useState(0);
  const [lowerActive, setLowerActive] = useState(false);
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);
  const [clock, setClock] = useState(new Date());

  const activeNationalDay = getActiveNationalDay(clock);
  const clips = nowPlaying?.clips || [];
  const current = nowPlaying?.current.clip;
  const currentHlsUrl = HLS_STREAM || current?.hlsUrl || "";
  const activeArtistSlug = pathname.startsWith("/sanatci/") ? decodeURIComponent(pathname.slice("/sanatci/".length).split("/")[0] || "") : "";
  nowRef.current = nowPlaying;

  useEffect(() => {
    try {
      const key = "cnr-tv-analytics-v1";
      const raw = localStorage.getItem(key);
      const stats = raw ? JSON.parse(raw) as { total?: number; days?: Record<string, number>; routes?: Record<string, number>; startedAt?: string } : {};
      const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
      stats.total = (stats.total || 0) + 1;
      stats.days = stats.days || {};
      stats.routes = stats.routes || {};
      stats.days[day] = (stats.days[day] || 0) + 1;
      stats.routes[pathname] = (stats.routes[pathname] || 0) + 1;
      stats.startedAt = stats.startedAt || new Date().toISOString();
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      for (const savedDay of Object.keys(stats.days)) if (savedDay < cutoff) delete stats.days[savedDay];
      localStorage.setItem(key, JSON.stringify(stats));
    } catch { /* Local analytics is optional when storage is unavailable. */ }
  }, [pathname]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let hasLiveData = false;
    let hasRestoredCache = false;
    const restoreLastGoodCatalog = () => {
      if (hasLiveData || hasRestoredCache) return;
      try {
        const saved = localStorage.getItem("cnr-last-good-catalog");
        if (!saved) return;
        const parsed = JSON.parse(saved) as { clips?: Clip[] };
        const clips = Array.isArray(parsed.clips) ? parsed.clips.filter((clip) => clip && typeof clip.id === "string" && typeof clip.durationSeconds === "number") : [];
        if (!clips.length) return;
        const now = Date.now();
        const upcoming: TimedClip[] = [];
        let cursor = now;
        for (let index = 0; index < Math.min(12, clips.length); index += 1) {
          const clip = clips[index];
          const duration = Math.max(60, clip.durationSeconds || 180);
          upcoming.push({
            clip,
            startsAt: new Date(cursor).toISOString(),
            endsAt: new Date(cursor + duration * 1000).toISOString(),
            offsetSeconds: 0
          });
          cursor += duration * 1000;
        }
        hasRestoredCache = true;
        setNowPlaying({
          source: "CNR saved catalog fallback",
          serverTime: new Date(now).toISOString(),
          current: upcoming[0],
          upcoming,
          clips,
          playlistDurationSeconds: clips.reduce((sum, clip) => sum + Math.max(60, clip.durationSeconds || 180), 0)
        });
        setCatalogError("Yayın kataloğu geçici olarak yenilenemiyor. Son başarılı klip listesiyle devam ediliyor.");
      } catch { /* A damaged local cache must never break the broadcast UI. */ }
    };
    const update = async () => {
      try {
        const response = await fetch("/api/now-playing", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Yayın bilgisi alınamadı.");
        if (cancelled) return;
        hasLiveData = true;
        setNowPlaying(data as NowPlaying);
        setCatalogError("");
        try { localStorage.setItem("cnr-last-good-catalog", JSON.stringify({ clips: data.clips })); } catch {}
      } catch {
        if (!cancelled) restoreLastGoodCatalog();
        if (!cancelled && !hasLiveData) setCatalogError((current) => current || "Yayın kataloğuna şu anda ulaşılamıyor. Bir süre sonra yeniden denenecek.");
      }
    };
    void update();
    const timer = window.setInterval(update, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/artists", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Sanatçı kataloğu alınamadı.");
        if (!cancelled) { setArtists(Array.isArray(data.artists) ? data.artists : []); setArtistError(""); }
      } catch (error) {
        if (!cancelled) setArtistError(error instanceof Error ? error.message : "Sanatçı kataloğuna ulaşılamadı.");
      }
    };
    void load();
    const timer = window.setInterval(load, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!activeArtistSlug) { setArtistDetail(null); setArtistError(""); return; }
    let cancelled = false;
    fetch("/api/artists/" + encodeURIComponent(activeArtistSlug), { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Sanatçı profili bulunamadı."); return data.artist as Artist; })
      .then((artist) => { if (!cancelled) { setArtistDetail(artist); setArtistError(""); } })
      .catch((error: unknown) => { if (!cancelled) { setArtistDetail(null); setArtistError(error instanceof Error ? error.message : "Sanatçı profili yüklenemedi."); } });
    return () => { cancelled = true; };
  }, [activeArtistSlug]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) { setSearchResults(null); setSearchLoading(false); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch("/api/search?q=" + encodeURIComponent(query), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Arama tamamlanamadı.");
        if (!cancelled) setSearchResults(data as SearchResults);
      } catch {
        if (!cancelled) setSearchResults({ artists: [], clips: [], databaseConnected: false });
      } finally { if (!cancelled) setSearchLoading(false); }
    }, 600);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    const query = directorySearch.trim();
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const url = query.length >= 2 ? "/api/artists?q=" + encodeURIComponent(query) : "/api/artists";
        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json();
        if (response.ok && !cancelled) setArtists(Array.isArray(data.artists) ? data.artists : []);
      } catch { /* Keep last successfully loaded results. */ }
    }, query.length >= 2 ? 650 : 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [directorySearch]);

  useEffect(() => {
    try {
      const savedFavorites: unknown = JSON.parse(localStorage.getItem("cnr-favorites") || "[]");
      setFavorites(Array.isArray(savedFavorites) ? savedFavorites.filter((item): item is string => typeof item === "string") : []);
    } catch { setFavorites([]); }
    try { setDarkMode(localStorage.getItem("cnr-dark-mode") !== "false"); } catch {}
    try { setSoundEnabled(localStorage.getItem("cnr-sound") === "true"); } catch {}
    try { setSubtitleEnabled(localStorage.getItem("cnr-subtitles-enabled") === "true"); } catch {}
  }, []);

  const toggleSubtitles = () => {
    const next = !subtitleEnabled;
    if (currentHlsUrl) {
      const tracks = hlsVideoRef.current?.textTracks;
      if (!tracks || tracks.length === 0) {
        notify("Bu HLS yayın kaynağında altyazı parçası bulunmuyor.");
        return;
      }
      for (let i = 0; i < tracks.length; i += 1) {
        tracks[i].mode = next ? "showing" : "disabled";
      }
    } else {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) {
        notify("Altyazı ayarı için oynatıcı hazırlanıyor.");
        return;
      }
      try {
        if (!player.setOption) throw new Error("captions API unavailable");
        player.setOption("captions", "track", next ? { languageCode: "tr" } : {});
      } catch {
        notify("Bu videoda açılabilir bir altyazı parçası bulunamadı.");
        return;
      }
    }
    setSubtitleEnabled(next);
    try { localStorage.setItem("cnr-subtitles-enabled", String(next)); } catch {}
  };

  // HLS-first playback: prefer hls.js on MSE-capable browsers, then native HLS.
  useEffect(() => {
    if (pathname !== "/canli-yayin" || !currentHlsUrl) return;
    let disposed = false;
    let started = false;
    let localHls: HlsInstance | null = null;
    const video = hlsVideoRef.current;
    if (!video) return;

    setPlayerReady(false);
    setPlayerPlaying(false);
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true;

    const alignToSchedule = () => {
      if (HLS_STREAM) return;
      const data = nowRef.current;
      const item = data?.current;
      if (!item) return;
      const serverTime = Date.parse(data.serverTime);
      const elapsed = Number.isFinite(serverTime) ? Math.max(0, (Date.now() - serverTime) / 1000) : 0;
      const target = Math.max(0, item.offsetSeconds + elapsed);
      if (Number.isFinite(video.duration) && target < video.duration - 0.5) {
        try { video.currentTime = target; } catch { /* Metadata may still be settling. */ }
      }
    };

    const startPlayback = () => {
      if (disposed || started || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      started = true;
      alignToSchedule();
      setPlayerReady(true);
      video.muted = true;
      setMuted(true);
      void video.play()
        .then(() => { if (!disposed) setPlayerPlaying(true); })
        .catch(() => { if (!disposed) notify("HLS yayını hazır. Oynatmayı başlatmak için ekrana dokunun."); });
    };

    const onMetadata = () => startPlayback();
    const onVideoError = () => {
      if (!disposed) {
        setPlayerReady(false);
        setPlayerPlaying(false);
        notify("HLS kaynağı yüklenemedi. Manifest adresini, segmentleri ve CORS ayarlarını kontrol edin.");
      }
    };
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("error", onVideoError);

    const attachHls = () => {
      if (disposed) return;
      const HlsPlayer = window.Hls;

      if (HlsPlayer?.isSupported()) {
        localHls = new HlsPlayer({
          enableWorker: true,
          lowLatencyMode: Boolean(HLS_STREAM),
          backBufferLength: 60,
          maxBufferLength: 30
        });
        hlsInstanceRef.current = localHls;
        localHls.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
          if (video.readyState >= HTMLMediaElement.HAVE_METADATA) startPlayback();
        });
        localHls.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (disposed || !data || !data.fatal) return;
          if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR) localHls?.startLoad();
          else if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR) localHls?.recoverMediaError();
          else {
            setPlayerReady(false);
            setPlayerPlaying(false);
            notify("HLS oynatıcı kritik bir hata aldı. Yayın kaynağını kontrol edin.");
          }
        });
        localHls.loadSource(currentHlsUrl);
        localHls.attachMedia(video);
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = currentHlsUrl;
        video.load();
        return;
      }

      notify("Bu cihaz HLS oynatmayı desteklemiyor.");
    };

    const ensureHls = () => {
      if (disposed) return;
      if (window.Hls) {
        attachHls();
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-cnr-hls="true"]');
      if (existing) {
        existing.addEventListener("load", attachHls, { once: true });
        existing.addEventListener("error", onVideoError, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js";
      script.async = true;
      script.dataset.cnrHls = "true";
      script.onload = attachHls;
      script.onerror = onVideoError;
      document.head.appendChild(script);
    };
    ensureHls();

    return () => {
      disposed = true;
      video.pause();
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("error", onVideoError);
      video.removeAttribute("src");
      video.load();
      localHls?.destroy();
      if (hlsInstanceRef.current === localHls) hlsInstanceRef.current = null;
      setPlayerReady(false);
      setPlayerPlaying(false);
    };
  }, [pathname, currentHlsUrl, nowPlaying?.current.clip.id]);

  // Keep each HLS VOD clip aligned to the channel clock without reloading its manifest.
  useEffect(() => {
    if (pathname !== "/canli-yayin" || !currentHlsUrl || HLS_STREAM || !playerReady) return;
    const sync = () => {
      const data = nowRef.current;
      const item = data?.current;
      const video = hlsVideoRef.current;
      if (!data || !item || !video || !Number.isFinite(video.duration)) return;
      const serverTime = Date.parse(data.serverTime);
      const elapsed = Number.isFinite(serverTime) ? Math.max(0, (Date.now() - serverTime) / 1000) : 0;
      const target = Math.max(0, item.offsetSeconds + elapsed);
      if (target < video.duration - 0.5 && Math.abs(video.currentTime - target) > 4) {
        try { video.currentTime = target; } catch { /* Ignore transient seek errors. */ }
      }
      if (video.paused) void video.play().catch(() => undefined);
    };
    sync();
    const timer = window.setInterval(sync, 12000);
    return () => window.clearInterval(timer);
  }, [pathname, currentHlsUrl, nowPlaying?.current.clip.id, playerReady]);

  useEffect(() => {
    if (pathname !== "/canli-yayin" || HLS_ONLY || currentHlsUrl || !nowPlaying?.current.clip) return;
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
          fs: 0, iv_load_policy: 3, cc_load_policy: 0, hl: "tr",
          enablejsapi: 1, origin: window.location.origin
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
            if (event.data === states.PLAYING) {
              if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
              transitionTimerRef.current = window.setTimeout(() => setVideoTransitioning(false), 420);
            }
          },
          onApiChange: (event) => {
            const captionsOn = localStorage.getItem("cnr-subtitles-enabled") === "true";
            try { event.target.setOption?.("captions", "track", captionsOn ? { languageCode: "tr" } : {}); } catch {}
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
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
      setVideoTransitioning(false);
      setPlayerReady(false);
      setPlayerPlaying(false);
    };
  }, [pathname === "/canli-yayin", Boolean(nowPlaying?.current.clip?.id), Boolean(currentHlsUrl)]);

  useEffect(() => {
    if (pathname !== "/canli-yayin" || HLS_ONLY || currentHlsUrl || !playerReadyRef.current) return;
    const sync = () => {
      const data = nowRef.current;
      const item = data?.current;
      const player = playerRef.current;
      if (!item || !player || !playerReadyRef.current) return;
      const age = Math.max(0, (Date.now() - Date.parse(data.serverTime)) / 1000);
      const target = Math.max(0, item.offsetSeconds + age);
      if (loadedVideoRef.current !== item.clip.id) {
        setVideoTransitioning(true);
        if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
        loadedVideoRef.current = item.clip.id;
        player.loadVideoById({ videoId: item.clip.id, startSeconds: target });
        return;
      }
      const actual = player.getCurrentTime();
      if (Number.isFinite(actual) && Math.abs(actual - target) > 8) player.seekTo(target, true);
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
    const item = nowPlaying?.current;
    if (!item) { setLowerActive(false); return; }
    let hideTimer: number | undefined;
    const duration = Math.max(1, (Date.parse(item.endsAt) - Date.parse(item.startsAt)) / 1000);
    const cardDuration = 7.2;
    const tick = () => {
      const elapsed = (Date.now() - Date.parse(item.startsAt)) / 1000;
      const marker = elapsed >= 0 && elapsed <= cardDuration ? "start:" + item.clip.id
        : elapsed >= duration - cardDuration && elapsed <= duration + 0.5 ? "end:" + item.clip.id : "";
      if (marker && marker !== lowerWindowRef.current) {
        lowerWindowRef.current = marker;
        setLowerKey((value) => value + 1);
        setLowerActive(true);
        if (hideTimer) window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => setLowerActive(false), 7200);
      }
      if (!marker && elapsed > cardDuration && elapsed < duration - cardDuration) lowerWindowRef.current = "";
      if (elapsed > duration + 1) setLowerActive(false);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => { window.clearInterval(timer); if (hideTimer) window.clearTimeout(hideTimer); };
  }, [nowPlaying?.current.clip.id, nowPlaying?.current.startsAt, nowPlaying?.current.endsAt]);

  const filteredClips = useMemo(() => clips.filter((clip) => {
    const categoryMatches = selectedCategory === "Tümü" || selectedCategory === "Top 20" || clip.category === selectedCategory;
    const formatMatches = selectedFormat === "Tümü" || (clip.videoType || "Müzik Videosu") === selectedFormat;
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    return categoryMatches && formatMatches && (!query || (clip.title + " " + clip.artist + " " + clip.category + " " + (clip.videoType || "")).toLocaleLowerCase("tr-TR").includes(query));
  }), [clips, selectedCategory, selectedFormat, searchQuery]);

  const uniqueArtists = useMemo(() => {
    const seen = new Set<string>();
    return clips.filter((clip) => {
      const key = clip.artist.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [clips]);

  const visibleArtists = useMemo(() => {
    const query = directorySearch.trim().toLocaleLowerCase("tr-TR");
    return artists.filter((artist) => !query || (artist.name + " " + (artist.genre || "")).toLocaleLowerCase("tr-TR").includes(query));
  }, [artists, directorySearch]);

  const togglePlayPause = () => {
    const video = currentHlsUrl ? hlsVideoRef.current : null;
    if (video) {
      if (video.paused) void video.play().then(() => setPlayerPlaying(true)).catch(() => notify("Yayın başlatılamadı."));
      else { video.pause(); setPlayerPlaying(false); }
      return;
    }
    const player = playerRef.current;
    if (HLS_ONLY && !currentHlsUrl) { notify("HLS yayın manifesti henüz tanımlanmadı."); return; }
    if (!player || !playerReadyRef.current) { notify("Oynatıcı hazırlanıyor."); return; }
    if (player.getPlayerState() === 1) { player.pauseVideo(); setPlayerPlaying(false); }
    else { player.playVideo(); setPlayerPlaying(true); }
  };

  const toggleMute = () => {
    const video = currentHlsUrl ? hlsVideoRef.current : null;
    if (currentHlsUrl) {
      if (!video) { notify("Ses kontrolü hazırlanıyor."); return; }
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      setMuted(nextMuted);
      setSoundEnabled(!nextMuted);
      try { localStorage.setItem("cnr-sound", String(!nextMuted)); } catch {}
      if (!nextMuted && video.paused) {
        void video.play().catch(() => notify("Ses açıldı; yayını başlatmak için ekrana dokunun."));
      }
      return;
    }

    const player = playerRef.current;
    if (!player || !playerReadyRef.current) {
      notify("Ses kontrolü için oynatıcı hazırlanıyor.");
      return;
    }
    const nextMuted = !player.isMuted();
    if (nextMuted) player.mute();
    else { player.unMute(); player.setVolume?.(100); }
    setMuted(nextMuted);
    setSoundEnabled(!nextMuted);
    try { localStorage.setItem("cnr-sound", String(!nextMuted)); } catch {}
  };

  const toggleSoundPreference = () => {
    const next = !soundEnabled;
    const video = currentHlsUrl ? hlsVideoRef.current : null;
    const player = playerRef.current;
    if (video) {
      video.muted = !next;
      setMuted(!next);
      if (next && video.paused) void video.play().then(() => setPlayerPlaying(true)).catch(() => notify("Ses tercihi kaydedildi. Oynatmayı başlatmak için ekrana dokunun."));
    } else if (player && playerReadyRef.current) {
      if (next) { player.unMute(); player.setVolume?.(100); }
      else player.mute();
      setMuted(!next);
    } else {
      setMuted(!next);
      notify(next ? "Ses tercihi kaydedildi. Canlı yayında ses açma tarayıcı izni gerektirebilir." : "Sessiz yayın tercihi kaydedildi.");
    }
    setSoundEnabled(next);
    try { localStorage.setItem("cnr-sound", String(next)); } catch { notify("Ses değişti ancak tarayıcı tercihi kaydedemedi."); }
  };

  const startWithSound = () => {
    const video = currentHlsUrl ? hlsVideoRef.current : null;
    if (video) { video.muted = false; setMuted(false); setSoundEnabled(true); localStorage.setItem("cnr-sound", "true"); void video.play().then(() => setPlayerPlaying(true)).catch(() => notify("Oynatma başlatılamadı. Yeniden deneyin.")); return; }
    const player = playerRef.current;
    if (HLS_ONLY && !currentHlsUrl) { notify("Yayın için CNR HLS manifest adresi gerekli."); return; }
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

  const returnToLive = () => {
    if (HLS_ONLY && !currentHlsUrl) { notify("Canlı yayın kaynağı henüz yapılandırılmadı."); return; }
    const video = currentHlsUrl ? hlsVideoRef.current : null;
    if (video) {
      if (HLS_STREAM && video.seekable.length) {
        try { video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 1); } catch {}
      } else {
        const data = nowRef.current;
        const item = data?.current;
        if (data && item) {
          const serverTime = Date.parse(data.serverTime);
          const elapsed = Number.isFinite(serverTime) ? Math.max(0, (Date.now() - serverTime) / 1000) : 0;
          const target = Math.max(0, item.offsetSeconds + elapsed);
          if (Number.isFinite(video.duration) && target < video.duration) {
            try { video.currentTime = target; } catch {}
          }
        }
      }
      void video.play().then(() => setPlayerPlaying(true)).catch(() => notify("Canlı konuma dönülemedi."));
      notify("Yayın çizelgesinin canlı konumuna dönüldü.");
      return;
    }
    const player = playerRef.current;
    if (player && playerReadyRef.current) {
      const data = nowRef.current;
      const item = data?.current;
      if (data && item) {
        const elapsed = Math.max(0, (Date.now() - Date.parse(data.serverTime)) / 1000);
        player.seekTo(item.offsetSeconds + elapsed, true);
      }
      player.playVideo();
      notify("Canlı konuma dönüldü.");
    }
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
    try { localStorage.setItem("cnr-dark-mode", String(next)); }
    catch { notify("Tema değişti ancak tarayıcı tercihi kaydedemedi."); }
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
        <div><small>{clip.category} · {clip.videoType || "Müzik Videosu"}</small><a href={"https://www.youtube.com/watch?v=" + clip.id} target="_blank" rel="noreferrer"><b>{clip.title}</b></a><span>{clip.artist}</span></div>
        <button className={favorites.includes(clip.id) ? "icon-action favourite active" : "icon-action favourite"} onClick={() => toggleFavorite(clip.id)} aria-label="Favorilere ekle"><Heart size={17} fill={favorites.includes(clip.id) ? "currentColor" : "none"} /></button>
      </div>
    </article>
  );

  const renderArtistCard = (artist: Artist) => (
    <Link className="artist-card" key={artist.slug} href={"/sanatci/" + encodeURIComponent(artist.slug)}>
      <span className="artist-card-image">
        {artist.avatar_url ? <Image src={artist.avatar_url} alt={artist.name} width={112} height={112} unoptimized /> : <span>{artist.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</span>}
      </span>
      <b className="artist-card-name">{artist.name}{artist.is_verified && <BadgeCheck className="artist-red-check" size={17} aria-label="CNR tarafından doğrulandı" />}</b>
      <small>{artist.genre || "Müzik Sanatçısı"}</small>
      <span className="artist-card-link">Profili görüntüle <ChevronRight size={14} /></span>
    </Link>
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
            {activeNationalDay && <div className="special-day-bug" role="img" aria-label={activeNationalDay.label}>
              <img
                src="https://media.giphy.com/media/Sqs3q0jJuafiJ6FAUn/giphy.gif"
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </div>}
            {currentHlsUrl ? <video ref={hlsVideoRef} className="cnr-hls-video" autoPlay muted={muted} playsInline crossOrigin="anonymous" preload="auto" onPlaying={() => setPlayerPlaying(true)} onPause={() => setPlayerPlaying(false)} onCanPlay={() => setPlayerReady(true)} onWaiting={() => setPlayerPlaying(false)} /> : <div id="cnr-live-player" className="youtube-video-host" />}
            <div className={"cnr-video-transition " + (videoTransitioning ? "is-active" : "")} aria-hidden="true" />
            {(!current || (Boolean(catalogError) && !playerPlaying)) && <div className="broadcast-empty-overlay" role="status" aria-live="polite"><Radio size={32} /><b>YAKINDA YAYINDAYIZ</b><span>CNR Müzik TV yayın akışı hazırlanıyor.</span><small>Klipler yeniden yüklendiğinde yayın otomatik başlayacak.</small><strong>ÇOK YAKINDA · CNR MÜZİK TV</strong></div>}
            <div className="live-channel-bug" aria-label="CNR Müzik TV kanal logosu">
              <div className="cnr-logo-effects">
                <Image src={LOGO} alt="CNR Müzik TV" width={164} height={55} unoptimized />
                <span className="cnr-logo-metallic-shine" aria-hidden="true" />
                <div className="cnr-logo-snowfield" aria-hidden="true">
                  {Array.from({ length: 16 }, (_, index) => <i key={index} className={index % 4 === 0 ? "flake" : "snow-dot"} style={{ "--x": ((index * 31) % 96) + "%", "--s": (index % 4 === 0 ? 7 + (index % 3) * 2 : 2 + (index % 2)) + "px", "--d": (4.8 + (index % 5) * 1.1) + "s", "--delay": "-" + ((index * 0.83) % 9) + "s", "--drift": ((index % 2 ? 1 : -1) * (4 + (index % 4) * 2)) + "px" } as CSSProperties} />)}
                </div>
                
              </div>
            </div>
            {current && !playerPlaying && (currentHlsUrl || !HLS_ONLY) && <button className="screen-start" onClick={startWithSound}><Play fill="currentColor" size={19} /> YAYINI BAŞLAT</button>}
            <div className="screen-bottom"><span>● {currentHlsUrl ? "CNR HLS YAYINI" : HLS_ONLY ? "HLS KAYNAĞI BEKLENİYOR" : "YOUTUBE YEDEK YAYIN"}</span><span>{h}</span></div>
            <div className={"cnr-lower-third " + (lowerActive ? "show" : "")} key={lowerKey} aria-live="polite">
              <div className="cnr-lt-logo">
                <span className="cnr-lt-logo-frame" aria-hidden="true" />
                <Image src={LOGO} alt="CNR Müzik TV" width={300} height={100} unoptimized />
                <span className="cnr-lt-logo-glint" aria-hidden="true" />
              </div>
              <div className="cnr-lt-divider" aria-hidden="true" />
              <div className="cnr-lt-band">
                <span className="cnr-lt-kicker"><i /> CNR MUSIC PREMIERE <em>·</em> ON AIR</span>
                <b className="cnr-lt-artist">{current?.artist || "CNR Müzik TV"}</b>
                <span className="cnr-lt-track">{current?.title || "Müzik Kuşağı"}</span>
              </div>
              <div className="cnr-lt-equalizer" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ animationDelay: (i * 0.065) + "s" }} />)}
              </div>
              <span className="cnr-lt-edge" aria-hidden="true" />
            </div>
          </div>
          <div className="broadcast-controls">
            <button className="player-button" onClick={togglePlayPause} aria-label={playerPlaying ? "Yayını duraklat" : "Yayını oynat"}>{playerPlaying ? <Pause /> : <Play fill="currentColor" />}</button>
            <button className="control-live" onClick={returnToLive}><Radio size={16} /> CANLIYA DÖN</button>
            <div className="control-spacer" />
            <span className="sync-label"><span /> {currentHlsUrl ? "HLS YAYIN" : HLS_ONLY ? "HLS KAYNAĞI BEKLENİYOR" : "YOUTUBE YEDEK"}</span>
            <button className={"player-button " + (muted ? "" : "is-active")} onClick={toggleMute} aria-label={muted ? "Sesi aç" : "Sesi kapat"} title={muted ? "Sesi aç" : "Sesi kapat"}>{muted ? <VolumeX /> : <Volume2 />}</button>
            <button className={"player-button caption-toggle " + (subtitleEnabled ? "is-active" : "")} onClick={toggleSubtitles} aria-label={subtitleEnabled ? "Altyazıyı kapat" : "Altyazıyı aç"} title={subtitleEnabled ? "Altyazıyı kapat" : "Altyazıyı aç"}><Captions /></button>
            <button className="player-button" onClick={toggleFullscreen} aria-label="Tam ekran">{fullScreen ? <X /> : <Expand />}</button>
          </div>
        </div>
        <aside className="live-side-panel">
          <div className="panel-heading"><div><span className="eyebrow">ŞU ANDA</span><h2>Yayında</h2></div><span className="live-chip">{current ? "CANLI" : "BEKLEMEDE"}</span></div>
          {current && <div className="now-playing-card"><Image src={thumb(current.id)} alt={current.title} width={400} height={225} unoptimized /><div><small>{getProgramName(current.category)}</small><b>{current.title}</b><span>{current.artist}</span></div></div>}
          <div className="live-status-grid"><div><span>Yayın durumu</span><b><i /> {current ? "AKTİF" : "BEKLEMEDE"}</b></div><div><span>Oynatıcı</span><b>{playerReady ? "HAZIR" : HLS_ONLY && !currentHlsUrl ? "KAYNAK BEKLENİYOR" : "BAĞLANIYOR"}</b></div></div>
          <div className="panel-heading upcoming-heading"><div><span className="eyebrow">SIRADAKİ</span><h2>Yayın Akışı</h2></div><Link href="/yayin-akisi">Tümü <ChevronRight size={15} /></Link></div>
          <div className="upcoming-list">{(nowPlaying?.upcoming || []).slice(1, 6).map((item) => <div className="upcoming-row" key={item.clip.id + item.startsAt}><Image src={thumb(item.clip.id, "mqdefault")} alt="" width={88} height={50} unoptimized /><span className="upcoming-time">{formatTime(item.startsAt)}</span><div><b>{item.clip.title}</b><small>{getProgramName(item.clip.category)}</small></div></div>)}</div>
          <AdPlacement className="cnr-ad-live" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIVE || ""} label="Yayın sayfası sponsoru" format="rectangle" />
          
          <button className="secondary-wide" onClick={sharePage}><Share2 size={16} /> YAYINI PAYLAŞ</button>
        </aside>
      </section>
      <p className="broadcast-disclaimer">{currentHlsUrl ? (HLS_STREAM ? "CNR özel HLS yayını etkin. Tek bir canlı kaynak tüm izleyicilere eşzamanlı iletilir." : "Bu klip CNR HLS altyapısından oynatılıyor.") : HLS_ONLY ? "HLS yayın kaynağı henüz tanımlanmadı. CNR tarafından sağlanan veya yayın hakkı alınmış videoların HLS manifestleri yüklendiğinde kanal yayına geçecek." : "Geçici YouTube yedek oynatımı etkin."}</p>
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
      {pageHeading("ARTIST DIRECTORY", "Sanatçılar", "CNR Müzik TV kataloğundaki sanatçılar. İsim, tarz veya müzik türüyle ara.")}
      <div className="artist-directory-search"><Search size={18} /><input value={directorySearch} onChange={(e) => setDirectorySearch(e.target.value)} placeholder="Sanatçı ara: Tarkan, pop, rap..." /><span>{visibleArtists.length} SONUÇ</span></div>
      <div className="artist-trust-note"><BadgeCheck size={16} /> Kırmızı tik yalnızca CNR tarafından onaylanan profillerde gösterilir.</div>
      {visibleArtists.length ? <div className="artist-grid">{visibleArtists.map(renderArtistCard)}</div> : <div className="empty-state"><Users size={32} /><b>{directorySearch ? "Eşleşen sanatçı bulunamadı" : "Sanatçı dizini yükleniyor"}</b><span>{artistError || "Sanatçı isimlerini aramak için arama alanını kullan."}</span><button onClick={() => setDirectorySearch("")}>Filtreyi temizle</button></div>}
    </>;
  } else if (pathname.startsWith("/sanatci/")) {
    const artistName = artistDetail?.name || activeArtistSlug.replace(/-/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr-TR"));
    content = <>
      {pageHeading("ARTIST PROFILE", artistName || "Sanatçı Profili", artistDetail?.genre || "CNR Müzik TV sanatçı profili")}
      {artistDetail ? <>
        <section className="artist-profile">
          <div className="artist-profile-cover">{artistDetail.cover_url ? <Image src={artistDetail.cover_url} alt="" fill unoptimized /> : current && <Image src={thumb(current.id, "maxresdefault")} alt="" fill unoptimized />}</div>
          <div className="artist-profile-main">
            <div className="avatar">{artistDetail.avatar_url ? <Image src={artistDetail.avatar_url} alt={artistDetail.name} width={86} height={86} unoptimized /> : artistDetail.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</div>
            <div>
              {artistDetail.is_verified && <span className="verified"><BadgeCheck size={15} /> CNR TARAFINDAN DOĞRULANDI</span>}
              <h2>{artistDetail.name}{artistDetail.is_verified && <BadgeCheck className="artist-red-check profile-check" size={24} aria-label="Doğrulanmış sanatçı" />}</h2>
              <p>{artistDetail.genre || "Sanatçı"} · CNR Müzik TV</p>
              <div className="artist-stats"><span><b>{clips.filter((clip) => clip.artist.toLocaleLowerCase("tr-TR") === artistDetail.name.toLocaleLowerCase("tr-TR")).length}</b>Yayın kataloğunda</span><span><b>CNR</b>Sanatçı dizini</span></div>
            </div>
            <button onClick={sharePage}><Share2 size={16} /> Paylaş</button>
          </div>
          {artistDetail.bio && <p className="artist-profile-bio">{artistDetail.bio}</p>}
        </section>
        <div className="platform-links">
          {artistDetail.youtube_url && <a href={artistDetail.youtube_url} target="_blank" rel="noreferrer">YouTube <ExternalLink size={14} /></a>}
          {artistDetail.spotify_url && <a href={artistDetail.spotify_url} target="_blank" rel="noreferrer">Spotify <ExternalLink size={14} /></a>}
          {artistDetail.instagram_url && <a href={artistDetail.instagram_url} target="_blank" rel="noreferrer">Instagram <ExternalLink size={14} /></a>}
        </div>
        <div className="section-title-row"><div><span className="eyebrow">SANATÇI SEÇKİSİ</span><h2>Yayın Kataloğundaki Klipler</h2></div></div>
        <div className="clip-grid">{clips.filter((clip) => clip.artist.toLocaleLowerCase("tr-TR") === artistDetail.name.toLocaleLowerCase("tr-TR")).slice(0, 12).map(renderClipCard)}</div>
      </> : <div className="empty-state"><Users size={32} /><b>Sanatçı profili yükleniyor</b><span>{artistError || "Sanatçı bilgileri getiriliyor."}</span><Link href="/sanatcilar">Sanatçı dizinine dön</Link></div>}
    </>;
  } else if (pathname === "/klip-arsivi") {
    content = <>
      {pageHeading("VIDEO LIBRARY", "Klip Arşivi", "Yayın kataloğundaki klipleri türüne, sanatçıya veya adına göre bul.")}
      <div className="archive-toolbar"><div className="archive-search"><Search size={17} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Klip veya sanatçı ara..." /></div><span className="result-count">{filteredClips.length} SONUÇ</span></div>
      <div className="filter-chips">{categoryNames.map((name) => <button key={name} className={selectedCategory === name ? "active" : ""} onClick={() => setSelectedCategory(name)}>{name}</button>)}</div>
      <div className="archive-format-heading"><span>VİDEO TÜRÜ</span><small>Kanalındaki içerikler otomatik sınıflandırılır.</small></div>
      <div className="filter-chips">{["Tümü", "Resmî Klip", "Şarkı Sözleri", "Audio", "Visualizer", "Müzik Videosu"].map((name) => <button key={name} className={selectedFormat === name ? "active" : ""} onClick={() => setSelectedFormat(name)}>{name}</button>)}</div>
      {filteredClips.length ? <div className="clip-grid archive-grid">{filteredClips.map(renderClipCard)}</div> : <div className="empty-state"><Search size={34} /><b>Aradığın klip bulunamadı</b><span>Başka bir sanatçı veya kategori deneyebilirsin.</span><button onClick={() => { setSearchQuery(""); setSelectedCategory("Tümü"); setSelectedFormat("Tümü"); }}>Filtreleri temizle</button></div>}
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
    router.replace("/hesabim");
    content = <div className="empty-state compact">Hesabına yönlendiriliyorsun…</div>;
  } else if (pathname === "/profil-legacy-disabled") {
    content = <>
      {pageHeading("PERSONAL SPACE", "Profil & Ayarlar", "CNR Müzik TV deneyimini düzenle.")}
      <div className="profile-card"><div className="profile-avatar">MC</div><div><span className="verified">✓ SANATÇI PROFİLİ</span><h2>Memet Çınar</h2><p>@memetcinarofficial · CNR Müzik Yapım®</p></div><Link href="/sanatci/memet-cinar" className="profile-edit">Profili Görüntüle <ChevronRight size={15} /></Link></div>
      <div className="profile-tabs">{["Hesabım", "Listelerim", "Ayarlar"].map((tab) => <button key={tab} className={profileTab === tab ? "active" : ""} onClick={() => setProfileTab(tab)}>{tab}</button>)}</div>
      {profileTab === "Hesabım" && <div className="settings-list"><button onClick={() => router.push("/sanatci/memet-cinar")}><UserCircle2 /><span><b>Sanatçı profilim</b><small>Herkese açık profilini görüntüle</small></span><ChevronRight /></button><button onClick={() => notify("Hesap ayrıntıları CNR üyelik sistemi bağlandığında açılacak.")}><Settings /><span><b>Hesap bilgileri</b><small>Üyelik ve iletişim ayarları</small></span><ChevronRight /></button></div>}
      {profileTab === "Listelerim" && <><div className="section-title-row"><div><span className="eyebrow">KİŞİSEL KOLEKSİYON</span><h2>Favori Kliplerim</h2></div><span className="result-count">{favorites.length} KAYIT</span></div><div className="clip-grid">{clips.filter((clip) => favorites.includes(clip.id)).map(renderClipCard)}</div>{favorites.length === 0 && <div className="empty-state compact"><Heart size={30} /><b>Henüz favorin yok</b><span>Klip arşivinden beğendiğin kayıtları favorilerine ekle.</span><Link href="/klip-arsivi">Klip arşivine git</Link></div>}</>}
      {profileTab === "Ayarlar" && <div className="settings-list">
        <button type="button" role="switch" aria-checked={darkMode} onClick={toggleDark}><span className="settings-icon"><Sparkles /></span><span><b>Karanlık Mod</b><small>Arayüz temasını değiştir ve tercihini kaydet</small></span><span className={darkMode ? "toggle on" : "toggle"} /></button>
        <button type="button" role="switch" aria-checked={soundEnabled} onClick={toggleSoundPreference}><span className="settings-icon"><Volume2 /></span><span><b>Ses Tercihi</b><small>Canlı yayının sesini aç veya sessize al</small></span><span className={soundEnabled ? "toggle on" : "toggle"} /></button>
        <button type="button" role="switch" aria-checked={subtitleEnabled} onClick={toggleSubtitles}><span className="settings-icon"><Captions /></span><span><b>Altyazılar</b><small>Desteklenen videolarda altyazıyı aç veya kapat</small></span><span className={subtitleEnabled ? "toggle on" : "toggle"} /></button>
      </div>}
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
      <AdPlacement className="cnr-ad-home-top" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP || ""} label="CNR Müzik TV sponsorlu alanı" format="horizontal" />
      <SponsorBand />
      <section className="quick-categories"><div className="section-title-row"><div><span className="eyebrow">TARZINI SEÇ</span><h2>Kategoriler</h2></div><Link href="/muzik-listeleri">Tüm listeler <ChevronRight size={15} /></Link></div><div className="category-grid">{categoryNames.slice(1).map((name, i) => <button className={"category-tile cat-color-" + i} key={name} onClick={() => { setSelectedCategory(name); router.push("/muzik-listeleri"); }}><span>{i === 0 ? <Mic2 /> : i === 1 ? <Activity /> : i === 2 ? <Disc3 /> : i === 3 ? <Heart /> : <Trophy />}</span><b>{name}</b><ChevronRight size={15} /></button>)}</div></section>
      <AdPlacement className="cnr-ad-home-mid" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID || ""} label="Öne çıkan içerikler arasında" format="horizontal" />
      <section className="home-section"><div className="section-title-row"><div><span className="eyebrow">ŞİMDİ YAYINDA</span><h2>Öne Çıkan Klipler</h2></div><Link href="/klip-arsivi">Klip arşivi <ChevronRight size={15} /></Link></div>{clips.length ? <div className="clip-grid">{clips.slice(0, 4).map(renderClipCard)}</div> : <div className="empty-state compact"><Radio size={28} /><b>{catalogError || "Yayın kataloğu yükleniyor"}</b><span>Son başarılı yayın kataloğu varsa otomatik kullanılacaktır.</span></div>}</section>
      <section className="home-section"><div className="section-title-row"><div><span className="eyebrow">SAHNE IŞIKLARI</span><h2>Sanatçılar</h2></div><Link href="/sanatcilar">Tüm sanatçılar <ChevronRight size={15} /></Link></div><div className="artist-strip">{uniqueArtists.slice(0, 6).map((clip) => <a href={"https://www.youtube.com/results?search_query=" + encodeURIComponent(clip.artist)} target="_blank" rel="noreferrer" key={clip.artist}><Image src={thumb(clip.id, "mqdefault")} alt="" width={90} height={90} unoptimized /><b>{clip.artist}</b><small>{clip.category}</small></a>)}</div></section>
    </>;
  }

  const isHome = pathname === "/";
  return <div className={darkMode ? "tv-app" : "tv-app light-mode"}>
    <header className="top-header">
      <Link href="/" className="brand-lockup"><Image src={LOGO} alt="CNR Müzik TV" width={230} height={78} priority unoptimized /><span>TÜRKİYE'NİN MÜZİK TELEVİZYONU</span></Link>
      <div className="republic-banner"><Image src="/ataturk-flag.webp" alt="Atatürk ve Türk bayrağı" width={180} height={180} unoptimized priority /><span>CUMHURİYETİN IŞIĞINDA</span></div>
      <div className="header-tools"><div className="digital-clock"><b>{h}</b><span>{clock.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</span></div><button className="header-icon" onClick={() => setSearchOpen(true)} aria-label="Ara"><Search /></button><div className="notification-wrap"><button className="header-icon" onClick={() => setNotificationsOpen((v) => !v)} aria-label="Bildirimler"><Bell /><i /></button>{notificationsOpen && <div className="notification-popover"><b>CNR Bildirimleri</b><p>Yeni program ve klip duyuruları burada görünecek.</p><button onClick={() => setNotificationsOpen(false)}>Tamam</button></div>}</div><Link href="/hesabim" className="header-icon" aria-label="Hesap"><UserCircle2 /></Link></div>
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
        <div className="page-content" key={pathname}>{content}</div>
        <footer className="site-footer"><div><Image src={LOGO} alt="CNR Müzik TV" width={150} height={51} unoptimized /><span>Türkiye'nin Müzik Televizyonu</span></div><p>© 2026 CNR Müzik Yapım® · CNR Müzik TV® · Tüm hakları saklıdır.</p><div className="footer-legal"><Link href="/hakkimizda">Hakkımızda</Link><Link href="/gizlilik-politikasi">Gizlilik</Link><Link href="/cerez-politikasi">Çerezler</Link><Link href="/kullanim-kosullari">Kullanım Koşulları</Link><Link href="/reklam-ve-gelir">Reklam & Gelir</Link></div><div className="footer-social"><a href="https://youtube.com/@memetcinar444" target="_blank" rel="noreferrer"><MonitorPlay /></a><a href="https://instagram.com/memetcinarofficial" target="_blank" rel="noreferrer"><Camera /></a><a href="https://open.spotify.com" target="_blank" rel="noreferrer"><Music2 /></a></div></footer>
      </main>
    </div>
    <nav className="mobile-dock">{navItems.slice(0, 5).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}><Icon size={18} /><span>{item.label.split(" ")[0]}</span></Link>; })}</nav>
    {searchOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}><div className="search-modal"><div className="modal-head"><div><span className="eyebrow">CNR MUSIC SEARCH</span><b>Ne dinlemek istersin?</b></div><button onClick={() => setSearchOpen(false)}><X /></button></div><div className="modal-searchbox"><Search size={18} /><input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Sanatçı, şarkı veya kategori ara..." /></div><div className="modal-results">
      {searchLoading && <p className="search-progress">YouTube ve sanatçı dizini aranıyor…</p>}
      {(searchResults?.artists || []).slice(0,5).map((artist)=><Link href={"/sanatci/"+encodeURIComponent(artist.slug)} key={"artist-"+artist.slug} onClick={()=>setSearchOpen(false)}><span className="search-artist-avatar">{artist.name.split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase()}</span><span><b>{artist.name}{artist.is_verified&&<BadgeCheck className="artist-red-check" size={15}/>}</b><small>Sanatçı profili · {artist.genre||"Müzik"}</small></span><ChevronRight size={15}/></Link>)}
      {(searchResults?.clips || (searchQuery.trim().length<2?filteredClips:[])).slice(0,8).map((clip)=><a href={"https://www.youtube.com/watch?v="+clip.id} target="_blank" rel="noreferrer" key={"clip-"+clip.id}><Image src={thumb(clip.id,"mqdefault")} alt="" width={72} height={46} unoptimized/><span><b>{clip.title}</b><small>{clip.artist}</small></span><ExternalLink size={15}/></a>)}
      {!searchLoading&&searchQuery.trim().length>=2&&!searchResults?.artists.length&&!searchResults?.clips.length&&<p className="search-progress">Eşleşme bulunamadı. Başka bir sanatçı veya klip adı dene.</p>}
    </div></div></div>}
    {toast && <div className="toast-message" role="status"><Check size={17} /> {toast}</div>}
  </div>;
}