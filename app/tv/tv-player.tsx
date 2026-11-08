"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Track = { id: string; title: string; channel: string; thumbnail: string; category: string; duration: string; url: string };
type PlayerEvent = { target: YTPlayer };
type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (n: number) => void;
  getVolume: () => number;
  loadModule: (name: string) => void;
  unloadModule: (name: string) => void;
  destroy: () => void;
};
declare global { interface Window { YT?: { Player: new (id: string, options: Record<string, unknown>) => YTPlayer; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number } }; onYouTubeIframeAPIReady?: () => void } }

const categories = ["Tümü", "Klip", "Şarkı Sözleri", "Audio", "Visualizer"];
const classify = (title: string) => {
  const t = title.toLocaleLowerCase("tr");
  if (/lyrics?|şarkı sözleri|lyric video/.test(t)) return "Şarkı Sözleri";
  if (/visuali[sz]er|visualizer/.test(t)) return "Visualizer";
  if (/audio|official audio|yatay video/.test(t)) return "Audio";
  return "Klip";
};

export default function TvPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState("Tümü");
  const [volume, setVolume] = useState(75);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const player = useRef<YTPlayer | null>(null);
  const queue = useMemo(() => filter === "Tümü" ? tracks : tracks.filter(t => t.category === filter), [tracks, filter]);
  const current = queue[active];

  const playIndex = useCallback((index: number) => {
    if (!queue.length) return;
    const safe = (index + queue.length) % queue.length;
    setActive(safe);
    const id = queue[safe].id;
    if (player.current) player.current.loadVideoById(id);
  }, [queue]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/youtube")
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Yayın listesi alınamadı."); return data; })
      .then(data => { if (!cancelled) { setTracks(data.tracks || []); setError(data.notice || ""); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!current) return;
    const boot = () => {
      if (!window.YT || !document.getElementById("cnr-youtube-player")) return;
      if (!player.current) {
        player.current = new window.YT.Player("cnr-youtube-player", {
          width: "100%", height: "100%", videoId: current.id,
          playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, enablejsapi: 1 },
          events: {
            onReady: (event: PlayerEvent) => { event.target.setVolume(volume); },
            onStateChange: (event: { data: number }) => {
              if (!window.YT) return;
              setPlaying(event.data === window.YT.PlayerState.PLAYING);
              if (event.data === window.YT.PlayerState.ENDED) setActive(i => (i + 1) % queue.length);
            },
          },
        });
      } else player.current.loadVideoById(current.id);
    };
    if (window.YT?.Player) boot();
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) { const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s); }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); boot(); };
    }
    return () => {};
  }, [current?.id, queue.length, volume]);

  useEffect(() => { if (player.current) player.current.setVolume(muted ? 0 : volume); }, [volume, muted]);
  useEffect(() => {
    if (!player.current) return;
    if (captions) player.current.loadModule("captions");
    else player.current.unloadModule("captions");
  }, [captions]);

  const addManual = () => {
    const match = manualUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (!match) { setError("Geçerli bir YouTube video bağlantısı gir."); return; }
    const id = match[1];
    const track = { id, title: "Kullanıcı tarafından eklenen video", channel: "YouTube", thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, category: "Klip", duration: "—", url: `https://www.youtube.com/watch?v=${id}` };
    setTracks(old => [track, ...old.filter(t => t.id !== id)]);
    setFilter("Tümü"); setActive(0); setManualUrl(""); setError("");
    if (player.current) player.current.loadVideoById(id);
  };

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #07080c; }
        .cnr-glow { text-shadow: 0 0 22px rgba(248,50,84,.5); }
        .cnr-scroll::-webkit-scrollbar { width: 6px; } .cnr-scroll::-webkit-scrollbar-thumb { background: #383944; border-radius: 8px; }
        .cnr-button { border: 1px solid #343541; border-radius: 999px; padding: 9px 15px; color: #c6c6d0; font-size: 13px; transition: .2s; }
        .cnr-button:hover,.cnr-button.active { background: #f22e52; border-color: #f22e52; color: white; }
      `}</style>
      <header className="border-b border-white/10 bg-black/50">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4">
          <a href="/" className="flex items-center gap-3 no-underline">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-lg font-black shadow-lg shadow-rose-950/50">C</div>
            <div><div className="text-lg font-black tracking-[.12em]">CNR MÜZİK <span className="text-rose-500">TV</span><sup className="ml-1 text-[9px]">®</sup></div><div className="text-[10px] tracking-[.28em] text-zinc-500">MÜZİĞİN KALBİ BURADA</div></div>
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold tracking-widest text-rose-300 sm:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"/> CANLI YAYIN</div>
          <a href="https://www.youtube.com/@memetcinar444" target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-rose-500 hover:text-white">YouTube Kanalı ↗</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:px-6">
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between"><div><p className="mb-1 text-[10px] font-bold tracking-[.35em] text-rose-400">7/24 MUSIC TELEVISION</p><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Kesintisiz müzik yayını.</h1></div><span className="rounded-md border border-rose-500/30 px-3 py-1 text-[10px] font-bold tracking-widest text-rose-400">ON AIR</span></div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/60">
            <div id="cnr-youtube-player" className="absolute inset-0 h-full w-full" />
            {!current && <div className="absolute inset-0 grid place-items-center bg-[#101116] p-8 text-center"><div><div className="cnr-glow mb-4 text-5xl">♫</div><h2 className="text-xl font-bold">CNR Müzik TV yayına hazırlanıyor</h2><p className="mt-2 max-w-md text-sm text-zinc-400">{loading ? "YouTube kanalındaki videolar yükleniyor…" : error || "Henüz oynatılabilir video bulunamadı."}</p></div></div>}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent"/>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3"><div className="min-w-0"><div className="mb-1 text-[9px] font-bold tracking-[.3em] text-rose-400">ŞİMDİ ÇALIYOR</div><div className="truncate text-lg font-bold">{current?.title || "CNR Müzik TV"}</div><div className="truncate text-xs text-zinc-300">{current?.channel || "MEMET ÇINAR • CNR Müzik Yapım®"}</div></div><div className="shrink-0 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[10px] font-bold tracking-widest">CNR <span className="text-rose-500">TV</span></div></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111218] p-3">
            <div className="flex items-center gap-2"><button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg hover:bg-rose-600" onClick={() => playIndex(active - 1)} aria-label="Önceki video">‹</button><button className="grid h-10 w-10 place-items-center rounded-full bg-rose-600 text-lg hover:bg-rose-500" onClick={() => playing ? player.current?.pauseVideo() : player.current?.playVideo()} aria-label={playing ? "Duraklat" : "Oynat"}>{playing ? "Ⅱ" : "▶"}</button><button className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg hover:bg-rose-600" onClick={() => playIndex(active + 1)} aria-label="Sonraki video">›</button><span className="ml-2 text-xs text-zinc-400">Otomatik sıradaki video</span></div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300"><label className="flex items-center gap-2"><button onClick={() => setMuted(v => !v)} className="text-base" aria-label="Sesi aç veya kapat">{muted || volume === 0 ? "🔇" : "🔊"}</button><input aria-label="Ses seviyesi" type="range" min="0" max="100" value={muted ? 0 : volume} onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }} className="w-20 accent-rose-500"/></label><button onClick={() => setCaptions(v => !v)} className={`rounded-md border px-3 py-2 ${captions ? "border-rose-500 bg-rose-500/15 text-rose-300" : "border-white/15"}`}>CC {captions ? "Açık" : "Kapalı"}</button></div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-[#111218] p-4"><div className="mb-3 text-sm font-bold">YouTube videosu ekle</div><div className="flex flex-col gap-2 sm:flex-row"><input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="YouTube video bağlantısını yapıştır…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-rose-500"/><button onClick={addManual} className="rounded-lg bg-rose-600 px-5 py-3 text-sm font-bold hover:bg-rose-500">Listeye ekle</button></div>{error && <p className="mt-2 text-xs text-amber-300">{error}</p>}</div>
        </section>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111218]">
          <div className="border-b border-white/10 p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Yayın akışı</h2><span className="text-xs text-zinc-500">{queue.length} video</span></div><div className="mt-4 flex flex-wrap gap-2">{categories.map(c => <button key={c} onClick={() => {setFilter(c);setActive(0);}} className={`cnr-button ${filter===c?"active":""}`}>{c}</button>)}</div></div>
          <div className="cnr-scroll max-h-[680px] overflow-y-auto p-3">
            {loading && <div className="p-8 text-center text-sm text-zinc-500">Kanal videoları yükleniyor…</div>}
            {!loading && queue.length===0 && <div className="p-8 text-center text-sm leading-6 text-zinc-500">Henüz listeye video gelmedi.<br/>YouTube API anahtarı yapılandırıldığında kanal videoları otomatik listelenir.</div>}
            {queue.map((track,i) => <button key={track.id} onClick={() => playIndex(i)} className={`mb-2 flex w-full gap-3 rounded-xl p-2 text-left transition hover:bg-white/5 ${i===active?"bg-rose-500/10 ring-1 ring-rose-500/30":""}`}><div className="relative h-[66px] w-[116px] shrink-0 overflow-hidden rounded-lg bg-black"><img src={track.thumbnail} alt="" className="h-full w-full object-cover"/>{i===active && <span className="absolute inset-0 grid place-items-center bg-black/40 text-xl text-rose-400">♫</span>}</div><div className="min-w-0 flex-1 self-center"><div className="line-clamp-2 text-xs font-semibold leading-5">{track.title}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500"><span>{track.category}</span><span>•</span><span>{track.duration}</span></div></div></button>)}
          </div>
          <div className="border-t border-white/10 p-4 text-center text-[10px] tracking-wider text-zinc-600">CNR MÜZİK YAPIM® • TÜM HAKLARI SAKLIDIR</div>
        </aside>
      </div>
    </main>
  );
}
