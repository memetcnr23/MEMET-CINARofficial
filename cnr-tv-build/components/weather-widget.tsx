"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, Wind } from "lucide-react";

type Weather = { location:{name:string}; current:{temperature_2m:number;apparent_temperature:number;relative_humidity_2m:number;wind_speed_10m:number;weather_code:number;is_day:number}; updatedAt:string };
function WeatherIcon({code,size=34}:{code:number;size?:number}) {
  const p={size,strokeWidth:1.8};
  if(code===0)return <Sun {...p} className="text-amber-300"/>;
  if(code<=2)return <CloudSun {...p} className="text-amber-200"/>;
  if(code===3)return <Cloud {...p} className="text-slate-200"/>;
  if(code<=48)return <CloudFog {...p} className="text-slate-300"/>;
  if(code<=57)return <CloudDrizzle {...p} className="text-sky-300"/>;
  if(code<=67||code<=82)return <CloudRain {...p} className="text-sky-300"/>;
  if(code<=77)return <CloudSnow {...p} className="text-cyan-100"/>;
  return <CloudLightning {...p} className="text-yellow-300"/>;
}
export default function WeatherWidget(){
 const [data,setData]=useState<Weather|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;const load=async()=>{try{const r=await fetch("/api/weather?city=Malatya",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();if(alive){setData(d);setFailed(false)}}catch{if(alive)setFailed(true)}};void load();const id=window.setInterval(load,600000);return()=>{alive=false;clearInterval(id)}},[]);
 return <Link href="/hava-durumu" aria-label="CNR Müzik TV canlı hava durumu sayfasını aç" className="group relative block overflow-hidden rounded-xl border border-red-500/40 bg-[radial-gradient(ellipse_at_85%_0%,rgba(255,24,54,.25),transparent_55%),linear-gradient(145deg,#171015,#08080b)] p-3 shadow-[0_8px_25px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 hover:border-red-400 hover:shadow-[0_0_24px_rgba(255,25,55,.22)]">
  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-500/10 blur-2xl transition group-hover:bg-red-500/20"/>
  <div className="relative flex items-center justify-between gap-2"><div><div className="flex items-center gap-1.5 text-[11px] font-black"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_9px_#34d399]"/> CANLI HAVA DURUMU</div><div className="mt-1 text-[10px] text-zinc-400">{data?.location.name||"Malatya"} · Anlık meteoroloji</div></div><span className="grid h-8 w-8 place-items-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200"><ArrowUpRight size={16}/></span></div>
  <div className="relative mt-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="weather-icon-float">{data?<WeatherIcon code={data.current.weather_code} size={43}/>:<Cloud size={40} className="text-zinc-500"/>}</div><div><div className="text-4xl font-black leading-none tracking-tight">{data?Math.round(data.current.temperature_2m)+"°":"—°"}<span className="text-xl">C</span></div><div className="mt-1 text-[10px] text-zinc-300">{data?"Hissedilen "+Math.round(data.current.apparent_temperature)+"°":"Gerçek veri yükleniyor"}</div></div></div><div className="space-y-1.5 text-[9px] text-zinc-300"><div className="flex items-center gap-1.5"><Droplets size={12} className="text-sky-300"/>{data?"Nem %"+data.current.relative_humidity_2m:"Nem —"}</div><div className="flex items-center gap-1.5"><Wind size={12} className="text-slate-300"/>{data?Math.round(data.current.wind_speed_10m)+" km/sa":"Rüzgâr —"}</div></div></div>
  <div className="relative mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[9px]"><span className={failed?"text-amber-300":"text-emerald-300"}>{failed?"Veri bağlantısı bekleniyor":data?"Open-Meteo · Canlı veri":"Meteoroloji servisine bağlanıyor"}</span><span className="flex items-center gap-1 font-black text-red-300">DETAYLI TAHMİN <ArrowUpRight size={12}/></span></div>
 </Link>
}
