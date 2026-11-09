"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, Clock3, Disc3, Radio, RefreshCw, Users, Eye, Globe2 } from "lucide-react";

type Clip = { id:string; title:string; artist:string; category:string; durationSeconds:number };
type Feed = { current?:{clip:Clip}; upcoming?:Array<{clip:Clip}>; clips?:Clip[]; playlistDurationSeconds?:number };
type Day = {day:string;views:number;sessions:number};
type Page = {path:string;views:number};
type Summary = {totalViews:number;uniqueSessions:number;todayViews:number;last7Days:Day[];topPages:Page[]};

function fmt(value:number){return new Intl.NumberFormat("tr-TR").format(value||0);}
function Stat({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}) {
  return <div className="rounded-2xl border border-white/10 bg-[#111015] p-5"><div className="flex items-center justify-between text-[#d4ad7b]"><span className="text-xs text-zinc-400">{label}</span>{icon}</div><strong className="mt-4 block text-2xl font-black tracking-tight">{value}</strong><p className="mt-2 text-[11px] text-zinc-500">{sub}</p></div>;
}

export default function AnalyticsPage(){
  const [summary,setSummary]=useState<Summary|null>(null);
  const [feed,setFeed]=useState<Feed|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [updated,setUpdated]=useState("");
  const [localViews,setLocalViews]=useState(0);

  async function refresh(){
    setLoading(true);
    try{
      const [analyticsResponse,feedResponse]=await Promise.all([
        fetch("/api/analytics",{cache:"no-store"}),
        fetch("/api/now-playing",{cache:"no-store"})
      ]);
      const analytics=await analyticsResponse.json();
      const feedData=await feedResponse.json();
      if(!analyticsResponse.ok)throw new Error(analytics.error||"Merkezi istatistikler alınamadı.");
      setSummary(analytics as Summary);
      if(feedResponse.ok)setFeed(feedData as Feed);
      setError("");
      setUpdated(new Date().toLocaleTimeString("tr-TR"));
    }catch(e){setError(e instanceof Error?e.message:"İstatistik verisi alınamadı.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("cnr-tv-analytics-v1");
      if(raw)setLocalViews((JSON.parse(raw) as {total?:number}).total||0);
    }catch{}
    void refresh();
    const timer=window.setInterval(()=>void refresh(),30000);
    return()=>window.clearInterval(timer);
  },[]);

  const clips=feed?.clips||[];
  const categories=useMemo(()=>Object.entries(clips.reduce<Record<string,number>>((acc,clip)=>{acc[clip.category]=(acc[clip.category]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]),[clips]);
  const artists=useMemo(()=>{const counts=new Map<string,number>();for(const clip of clips)counts.set(clip.artist,(counts.get(clip.artist)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,6)},[clips]);
  const days=summary?.last7Days||[];
  const maxDay=Math.max(1,...days.map(day=>day.views));

  return <main className="min-h-screen bg-[#08070a] px-4 py-6 text-white md:px-8 md:py-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-[#c7a77c] hover:text-white"><ArrowLeft size={15}/> CNR Müzik TV'ye dön</Link><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl border border-[#b88b55]/40 bg-[#b88b55]/10 text-[#e5c18f]"><BarChart3 size={24}/></div><div><p className="text-[10px] font-bold tracking-[.28em] text-[#d3ae7d]">CNR MÜZİK TV®</p><h1 className="text-2xl font-black tracking-tight md:text-3xl">İstatistik Merkezi</h1></div></div><p className="mt-3 text-sm text-zinc-400">Merkezi ziyaretçi analitiği ve canlı yayın kataloğu.</p></div><button onClick={()=>void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-bold hover:bg-white/10"><RefreshCw size={14}/> Yenile</button></div>

    {error&&<div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={<Eye size={18}/>} label="Toplam sayfa görüntüleme" value={summary?fmt(summary.totalViews):"—"} sub="Merkezi veritabanındaki kayıtlar"/>
      <Stat icon={<Users size={18}/>} label="Tekil tarayıcı oturumu" value={summary?fmt(summary.uniqueSessions):"—"} sub="Rastgele oturum kimliğine göre"/>
      <Stat icon={<Activity size={18}/>} label="Bugünkü görüntüleme" value={summary?fmt(summary.todayViews):"—"} sub="Türkiye saatiyle günlük toplam"/>
      <Stat icon={<Radio size={18}/>} label="Yayın durumu" value={feed?.current?.clip?"AKIŞ VAR":"BEKLEMEDE"} sub={feed?.current?.clip?.title||"Aktif klip bilgisi alınamadı"}/>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
      <section className="rounded-2xl border border-white/10 bg-[#111015] p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Son 7 günün trafiği</h2><p className="mt-1 text-xs text-zinc-500">Tüm ziyaretçilerin merkezi kayıtları</p></div><BarChart3 className="text-[#d4ad7b]"/></div><div className="flex h-48 items-end gap-3 border-b border-white/10 pb-2">{days.length?days.map(day=><div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-zinc-400">{fmt(day.views)}</span><div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-[#8f1731] to-[#e1b981]" style={{height:Math.max(5,day.views/maxDay*125)}}/><span className="text-[9px] text-zinc-500">{day.day.slice(5).replace("-","/")}</span></div>):<p className="m-auto text-sm text-zinc-500">{loading?"Veriler yükleniyor…":"Henüz ziyaret kaydı yok."}</p>}</div></section>
      <section className="rounded-2xl border border-white/10 bg-[#111015] p-5 md:p-6"><h2 className="mb-1 font-bold">Canlı yayın kataloğu</h2><p className="mb-4 text-xs text-zinc-500">YouTube yayın API'sinden</p>{feed?.current?.clip?<div className="flex gap-3"><img className="h-20 w-20 rounded-lg bg-black object-cover" src={`https://i.ytimg.com/vi/${feed.current.clip.id}/hqdefault.jpg`} alt="Klip kapağı"/><div className="min-w-0"><p className="truncate text-sm font-bold">{feed.current.clip.title}</p><p className="mt-1 text-xs text-zinc-400">{feed.current.clip.artist}</p><span className="mt-3 inline-block rounded-full bg-red-500/15 px-2 py-1 text-[9px] font-black tracking-wider text-red-300">YAYIN AKIŞI</span></div></div>:<p className="text-sm text-zinc-500">Aktif klip bilgisi yok.</p>}<div className="mt-5 border-t border-white/10 pt-4"><div className="flex justify-between text-xs"><span className="text-zinc-500">Katalogdaki klip</span><b>{fmt(clips.length)}</b></div><div className="mt-3 flex justify-between text-xs"><span className="text-zinc-500">Liste süresi</span><b>{feed?.playlistDurationSeconds?Math.floor(feed.playlistDurationSeconds/60)+" dk":"—"}</b></div><div className="mt-3 flex justify-between text-xs"><span className="text-zinc-500">Son güncelleme</span><b>{updated||"—"}</b></div></div></section>
    </div>

    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-[#111015] p-5"><h2 className="mb-4 font-bold">En çok ziyaret edilen sayfalar · 30 gün</h2>{summary?.topPages?.length?summary.topPages.map(page=><div key={page.path} className="flex items-center gap-3 border-b border-white/[.06] py-3 last:border-0"><span className="flex-1 truncate text-sm">{page.path}</span><b className="text-xs text-zinc-400">{fmt(page.views)}</b></div>):<p className="text-sm text-zinc-500">Henüz sayfa verisi yok.</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-[#111015] p-5"><h2 className="mb-4 font-bold">Kategori dağılımı</h2>{categories.length?categories.map(([name,count])=><div key={name} className="mb-4"><div className="mb-2 flex justify-between text-xs"><span>{name}</span><b>{count} klip</b></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#94152f] to-[#d7b17d]" style={{width:(count/Math.max(1,clips.length)*100)+"%"}}/></div></div>):<p className="text-sm text-zinc-500">Katalog verisi bekleniyor.</p>}</section>
      <section className="rounded-2xl border border-white/10 bg-[#111015] p-5 md:col-span-2"><h2 className="mb-4 font-bold">Katalogda öne çıkan sanatçılar</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{artists.map(([name,count],i)=><div key={name} className="flex items-center gap-3 rounded-lg bg-white/[.03] p-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[.06] text-xs text-[#d9b783]">{i+1}</span><span className="flex-1 truncate text-sm font-semibold">{name}</span><span className="text-xs text-zinc-400">{count} klip</span></div>)}</div>{!artists.length&&<p className="text-sm text-zinc-500">Sanatçı verisi bekleniyor.</p>}</section>
    </div>
    <div className="mt-6 rounded-xl border border-[#b88b55]/20 bg-[#b88b55]/[.05] p-4 text-xs leading-6 text-zinc-400"><Globe2 className="mr-2 inline text-[#d4ad7b]" size={15}/>Merkezi ölçüm; IP adresi, ad-soyad veya e-posta toplamaz. Tekil oturum sayısı, tarayıcıda tutulan rastgele kimlikle hesaplanır; aynı kişi farklı cihazlarda ayrı oturum sayılabilir. Yerel sayaç ({fmt(localViews)}) yalnızca eski tarayıcı verisidir ve merkezi toplamın parçası değildir.</div>
    <footer className="mt-8 text-center text-[10px] tracking-[.2em] text-zinc-600">CNR MÜZİK YAPIM® · CNR İSTATİSTİK MERKEZİ</footer>
  </div></main>;
}
