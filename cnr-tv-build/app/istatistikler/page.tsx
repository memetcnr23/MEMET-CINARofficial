"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, Clock3, Disc3, Globe2, Radio, RefreshCw, Users } from "lucide-react";

type Clip={id:string;title:string;artist:string;category:string;durationSeconds:number};
type Feed={current?:{clip:Clip};upcoming?:Array<{clip:Clip}>;clips?:Clip[];serverTime?:string;playlistDurationSeconds?:number;error?:string};
type LocalStats={total:number;days:Record<string,number>;routes:Record<string,number>;startedAt:string};
const STORE="cnr-tv-analytics-v1";
function readLocal():LocalStats{try{const raw=localStorage.getItem(STORE);if(raw)return JSON.parse(raw) as LocalStats;}catch{}return{total:0,days:{},routes:{},startedAt:new Date().toISOString()};}
function fmt(n:number){return new Intl.NumberFormat("tr-TR").format(n);}
export default function AnalyticsPage(){
 const [feed,setFeed]=useState<Feed|null>(null);
 const [local,setLocal]=useState<LocalStats>({total:0,days:{},routes:{},startedAt:""});
 const [loading,setLoading]=useState(true);
 const [updated,setUpdated]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Istanbul"});
  const stats=readLocal();stats.total+=1;stats.days[today]=(stats.days[today]||0)+1;stats.routes["/istatistikler"]=(stats.routes["/istatistikler"]||0)+1;
  const cutoff=new Date(Date.now()-30*86400000).toISOString().slice(0,10);for(const day of Object.keys(stats.days))if(day<cutoff)delete stats.days[day];
  localStorage.setItem(STORE,JSON.stringify(stats));setLocal(stats);
 },[]);
 useEffect(()=>{let active=true;const load=async()=>{try{const res=await fetch("/api/now-playing",{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Yayın verisi alınamadı.");if(active){setFeed(data);setError("");setUpdated(new Date().toLocaleTimeString("tr-TR"));}}catch(e){if(active)setError(e instanceof Error?e.message:"Yayın verisi alınamadı.");}finally{if(active)setLoading(false);}};void load();const timer=setInterval(load,15000);return()=>{active=false;clearInterval(timer)};},[]);
 const clips=feed?.clips||[];const categories=useMemo(()=>Object.entries(clips.reduce<Record<string,number>>((a,c)=>{a[c.category]=(a[c.category]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]),[clips]);
 const artists=useMemo(()=>{const counts=new Map<string,number>();for(const c of clips)counts.set(c.artist,(counts.get(c.artist)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,6)},[clips]);
 const days=Object.entries(local.days).sort((a,b)=>a[0].localeCompare(b[0])).slice(-7);const maxDay=Math.max(1,...days.map(x=>x[1]));
 return <main className="min-h-screen bg-[#08070a] text-white px-4 py-6 md:px-8 md:py-10">
  <div className="mx-auto max-w-7xl">
   <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
    <div><Link href="/" className="inline-flex items-center gap-2 text-xs text-[#c7a77c] hover:text-white mb-4"><ArrowLeft size={15}/> CNR Müzik TV'ye dön</Link><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl border border-[#b88b55]/40 bg-[#b88b55]/10 text-[#e5c18f]"><BarChart3 size={24}/></div><div><p className="text-[10px] tracking-[.28em] text-[#d3ae7d] font-bold">CNR MÜZİK TV®</p><h1 className="text-2xl md:text-3xl font-black tracking-tight">İstatistik Merkezi</h1></div></div><p className="text-sm text-zinc-400 mt-3">Yayın kataloğu, oynatma durumu ve bu tarayıcıdaki kullanım özeti.</p></div>
    <button onClick={()=>location.reload()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-bold hover:bg-white/10"><RefreshCw size={14}/> Yenile</button>
   </div>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
    <Stat icon={<Radio size={18}/>} label="Yayın durumu" value={feed?.current?.clip?"YAYINDA":"BEKLEMEDE"} sub={feed?.current?.clip?.title||error||"Oynatılabilir klip bekleniyor"} live={!!feed?.current?.clip}/>
    <Stat icon={<Disc3 size={18}/>} label="Katalogdaki klip" value={fmt(clips.length)} sub="Şu an API'den alınan gerçek kayıt"/>
    <Stat icon={<Users size={18}/>} label="Bu tarayıcıdaki ziyaret" value={fmt(local.total)} sub="Yalnızca bu cihaz ve tarayıcı"/>
    <Stat icon={<Clock3 size={18}/>} label="Liste süresi" value={feed?.playlistDurationSeconds?Math.floor(feed.playlistDurationSeconds/60)+" dk":"—"} sub="Mevcut yayın listesinin toplamı"/>
   </div>
   {error&&<div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200"><b>Yayın verisi alınamadı:</b> {error}</div>}
   <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
    <section className="rounded-2xl border border-white/10 bg-[#111015] p-5 md:p-6">
     <div className="flex items-center justify-between mb-5"><div><h2 className="font-bold">Son 7 gün</h2><p className="text-xs text-zinc-500 mt-1">Bu tarayıcıda kaydedilen sayfa açılışları</p></div><Activity className="text-[#d4ad7b]"/></div>
     <div className="flex h-44 items-end gap-3 border-b border-white/10 pb-2">{days.length?days.map(([day,count])=><div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-zinc-400">{count}</span><div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-[#8f1731] to-[#e1b981]" style={{height:Math.max(5,count/maxDay*110)}}/><span className="text-[9px] text-zinc-500">{day.slice(5).replace("-","/")}</span></div>):<p className="m-auto text-sm text-zinc-500">Henüz yeterli veri yok.</p>}</div>
     <p className="mt-4 text-[11px] leading-5 text-zinc-500">Bu grafik tüm site ziyaretçilerini değil, istatistik panelinin açık olduğu tarayıcıda biriken yerel ölçümü gösterir.</p>
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#111015] p-5 md:p-6">
     <h2 className="font-bold mb-1">Şu an çalan</h2><p className="text-xs text-zinc-500 mb-4">Canlı yayın API'sinden</p>
     {feed?.current?.clip?<div className="flex gap-3"><img className="h-20 w-20 rounded-lg object-cover bg-black" src={`https://i.ytimg.com/vi/${feed.current.clip.id}/hqdefault.jpg`} alt="Klip kapağı"/><div className="min-w-0"><p className="font-bold text-sm truncate">{feed.current.clip.title}</p><p className="text-xs text-zinc-400 mt-1">{feed.current.clip.artist}</p><span className="inline-block mt-3 rounded-full bg-red-500/15 px-2 py-1 text-[9px] font-black tracking-wider text-red-300">YAYIN AKIŞI</span></div></div>:<p className="text-sm text-zinc-500">{loading?"Yayın kontrol ediliyor…":"Şu anda aktif klip bilgisi yok."}</p>}
     <div className="mt-5 border-t border-white/10 pt-4"><div className="flex justify-between text-xs"><span className="text-zinc-500">Son güncelleme</span><b>{updated||"—"}</b></div><div className="flex justify-between text-xs mt-3"><span className="text-zinc-500">Sıradaki klip</span><b className="max-w-[60%] truncate">{feed?.upcoming?.[1]?.clip?.title||"—"}</b></div></div>
    </section>
   </div>
   <div className="grid gap-5 md:grid-cols-2 mt-5">
    <section className="rounded-2xl border border-white/10 bg-[#111015] p-5"><h2 className="font-bold mb-4">Kategori dağılımı</h2>{categories.length?categories.map(([name,count])=><div key={name} className="mb-4"><div className="flex justify-between text-xs mb-2"><span>{name}</span><b>{count} klip</b></div><div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#94152f] to-[#d7b17d]" style={{width:(count/Math.max(1,clips.length)*100)+"%"}}/></div></div>):<p className="text-sm text-zinc-500">Katalog verisi bekleniyor.</p>}</section>
    <section className="rounded-2xl border border-white/10 bg-[#111015] p-5"><h2 className="font-bold mb-4">Katalogda öne çıkan sanatçılar</h2>{artists.length?artists.map(([name,count],i)=><div key={name} className="flex items-center gap-3 border-b border-white/[.06] py-3 last:border-0"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[.06] text-xs text-[#d9b783]">{i+1}</span><span className="flex-1 text-sm font-semibold">{name}</span><span className="text-xs text-zinc-400">{count} klip</span></div>):<p className="text-sm text-zinc-500">Sanatçı verisi bekleniyor.</p>}</section>
   </div>
   <div className="mt-6 rounded-xl border border-[#b88b55]/20 bg-[#b88b55]/[.05] p-4 text-xs leading-6 text-zinc-400"><Globe2 size={15} className="inline mr-2 text-[#d4ad7b]"/>Ziyaretçi sayısı, ülke/cihaz kırılımı ve toplam izlenme gibi site genelindeki ölçümler henüz merkezi bir analitik sağlayıcıya bağlanmadı. Bu panel gerçek yayın kataloğunu gösterir; tarayıcıya özel ziyaret verisini genel site trafiği gibi sunmaz.</div>
   <footer className="mt-8 text-center text-[10px] tracking-[.2em] text-zinc-600">CNR MÜZİK YAPIM® · CNR İSTATİSTİK MERKEZİ</footer>
  </div>
 </main>
}
function Stat({icon,label,value,sub,live}:{icon:React.ReactNode;label:string;value:string;sub:string;live?:boolean}){
 return <div className="rounded-2xl border border-white/10 bg-[#111015] p-5"><div className="flex items-center justify-between text-[#d4ad7b]"><span className="text-xs text-zinc-400">{label}</span>{icon}</div><div className="mt-4 flex items-center gap-2"><strong className="text-2xl font-black tracking-tight">{value}</strong>{live&&<span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>}</div><p className="mt-2 text-[11px] text-zinc-500 line-clamp-2">{sub}</p></div>
}
