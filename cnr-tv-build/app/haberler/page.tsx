"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Globe2, Newspaper, Radio, RefreshCw, Signal } from "lucide-react";

type Article={title:string;summary:string;url:string;image:string|null;source:string;category:string;publishedAt:string};
type Feed={articles:Article[];updatedAt:string;sources:number;totalSources:number;live:boolean};
const fmt=(s:string)=>new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(s));
export default function HaberlerPage(){
 const [feed,setFeed]=useState<Feed|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const refresh=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/news",{cache:"no-store"});if(!r.ok)throw new Error("Haber akışı alınamadı");const data=await r.json();setFeed(data);if(!data.articles?.length)setError("Kaynaklardan şu anda haber alınamıyor.");}catch(e){setError(e instanceof Error?e.message:"Bağlantı hatası");}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),300000);return()=>clearInterval(id);},[refresh]);
 return <main className="min-h-screen bg-[#08080c] text-white">
  <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-5 sm:px-8">
   <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
    <Link href="/" className="flex items-center gap-3 text-sm font-black tracking-[.2em]"><span className="grid h-10 w-10 place-items-center border border-rose-500/40 bg-rose-950/40 text-rose-300 [clip-path:polygon(0_0,100%_0,100%_75%,75%_100%,0_100%)]">CNR</span>CNR MÜZİK TV <span className="text-zinc-500">/ HABER MERKEZİ</span></Link>
    <div className="flex items-center gap-3 text-[10px] font-bold tracking-[.16em] text-zinc-400"><span className="flex items-center gap-2 text-emerald-300"><i className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> CANLI KAYNAK</span><button onClick={()=>void refresh()} className="flex items-center gap-2 border border-white/15 px-3 py-2 hover:border-rose-400"><RefreshCw size={13}/> YENİLE</button></div>
   </header>
   <section className="relative mb-8 overflow-hidden border border-white/10 bg-[radial-gradient(ellipse_at_80%_10%,rgba(190,20,55,.24),transparent_48%),linear-gradient(120deg,#181117,#0b0b10_65%)] p-6 sm:p-10 [clip-path:polygon(0_0,100%_0,100%_calc(100%-22px),calc(100%-22px)_100%,0_100%)]">
    <div className="flex items-center gap-2 text-[10px] font-black tracking-[.3em] text-rose-300"><Radio size={14}/> CNR NEWS NETWORK</div>
    <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">HABER <span className="text-rose-400">MERKEZİ.</span></h1>
    <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">Güvenilir yayın kuruluşlarının açık haber akışları. Her başlık kendi kaynağına bağlanır; haber metni taklit edilmez.</p>
    <div className="mt-7 flex flex-wrap gap-2 text-[9px] font-bold tracking-widest text-zinc-400"><span className="border border-white/10 px-3 py-2">SON DAKİKA</span><span className="border border-white/10 px-3 py-2">GÜNDEM</span><span className="border border-white/10 px-3 py-2">DÜNYA</span><span className="border border-white/10 px-3 py-2">KÜLTÜR & SANAT</span></div>
   </section>
   <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-bold tracking-[.25em] text-rose-300">EDITORIAL DESK / 01</div><h2 className="mt-1 text-xl font-extrabold">En yeni haberler</h2></div><div className="text-[10px] text-zinc-500">{feed?feed.sources+"/"+feed.totalSources+" kaynak aktif":"Kaynaklar kontrol ediliyor"} {feed?" · "+fmt(feed.updatedAt):""}</div></div>
   {error&&<div className="mb-5 border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">{error}</div>}
   {loading&&!feed&&<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6},(_,i)=><div key={i} className="h-52 animate-pulse border border-white/10 bg-white/[.03]"/>)}</div>}
   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{feed?.articles.map((a,i)=><article key={a.url} className="group relative flex min-h-[220px] flex-col overflow-hidden border border-white/10 bg-[#101015] p-5 transition duration-300 hover:-translate-y-1 hover:border-rose-400/50 hover:bg-[#171219] [clip-path:polygon(0_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%)]"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black tracking-[.18em] text-rose-300">{a.category.toUpperCase()}</span><span className="text-[9px] text-zinc-500">#{String(i+1).padStart(2,"0")}</span></div><h3 className="mt-4 text-lg font-extrabold leading-snug group-hover:text-rose-200">{a.title}</h3><p className="mt-3 line-clamp-3 text-xs leading-6 text-zinc-400">{a.summary}</p><div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4"><span className="flex items-center gap-2 text-[9px] font-bold text-zinc-400"><Globe2 size={12}/>{a.source}<span className="text-zinc-600">·</span><Clock3 size={12}/>{fmt(a.publishedAt)}</span><a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] font-black tracking-wider text-rose-300 hover:text-white">KAYNAK <ArrowUpRight size={12}/></a></div></article>)}</div>
   <footer className="mt-10 flex items-start gap-3 border-t border-white/10 pt-5 text-[10px] leading-6 text-zinc-500"><Newspaper size={15} className="mt-1 shrink-0"/> Başlıklar, kısa açıklamalar ve yayın zamanları ilgili yayıncıların RSS akışlarından alınır. İçeriğin asıl sahibi ilgili haber kuruluşudur. Kaynağın sayfasını ziyaret ederek haberin tamamını okuyabilirsiniz.</footer>
  </div>
 </main>
}
