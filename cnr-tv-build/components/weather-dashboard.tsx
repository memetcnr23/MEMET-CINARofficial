"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Gauge, Globe2, LocateFixed, MapPin, Moon, RefreshCw, Search, Sun, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";

type WeatherData = {
 location:{name:string;country?:string;admin1?:string;latitude:number;longitude:number;timezone:string};
 current:{time:string;temperature_2m:number;relative_humidity_2m:number;apparent_temperature:number;is_day:number;precipitation:number;weather_code:number;wind_speed_10m:number;wind_direction_10m:number;surface_pressure:number};
 hourly:{time:string[];temperature_2m:number[];precipitation_probability:number[];weather_code:number[]};
 daily:{time:string[];weather_code:number[];temperature_2m_max:number[];temperature_2m_min:number[];sunrise:string[];sunset:string[];uv_index_max:number[];precipitation_probability_max:number[]};
 source:string;updatedAt:string;
};
const cities=[{name:"İstanbul",lat:41.0082,lon:28.9784},{name:"Ankara",lat:39.9334,lon:32.8597},{name:"İzmir",lat:38.4237,lon:27.1428},{name:"Bursa",lat:40.1885,lon:29.0610},{name:"Antalya",lat:36.8969,lon:30.7133},{name:"Trabzon",lat:41.0027,lon:39.7168},{name:"Erzurum",lat:39.9055,lon:41.2658},{name:"Diyarbakır",lat:37.9144,lon:40.2306}];
function weatherText(code:number){
 if(code===0)return "Açık";
 if(code<=2)return "Az bulutlu";
 if(code===3)return "Parçalı bulutlu";
 if(code<=48)return "Sisli";
 if(code<=57)return "Çisenti";
 if(code<=67)return "Yağmurlu";
 if(code<=77)return "Karlı";
 if(code<=82)return "Sağanak yağış";
 if(code<=86)return "Kar sağanağı";
 return "Gök gürültülü fırtına";
}
function WeatherIcon({code,size=32}:{code:number;size?:number}){
 const p={size,strokeWidth:1.8};
 if(code===0)return <Sun {...p} className="text-amber-300"/>;
 if(code<=2)return <CloudSun {...p} className="text-amber-200"/>;
 if(code===3)return <Cloud {...p} className="text-slate-200"/>;
 if(code<=48)return <CloudFog {...p} className="text-slate-300"/>;
 if(code<=57)return <CloudDrizzle {...p} className="text-sky-300"/>;
 if(code<=67||code<=82)return <CloudRain {...p} className="text-sky-300"/>;
 if(code<=77||code<=86)return <CloudSnow {...p} className="text-cyan-100"/>;
 return <CloudLightning {...p} className="text-yellow-300"/>;
}
function timeLabel(value:string){return value.includes("T")?value.slice(11,16):"—";}
function dayLabel(value:string){return new Intl.DateTimeFormat("tr-TR",{weekday:"long",day:"numeric",month:"short"}).format(new Date(value+"T12:00:00"));}
function Panel({children,className=""}:{children:React.ReactNode;className?:string}){return <section className={"weather-panel rounded-xl border border-red-500/35 bg-[linear-gradient(145deg,rgba(24,12,17,.96),rgba(7,7,10,.98))] shadow-[0_12px_32px_rgba(0,0,0,.35)] "+className}>{children}</section>}
function PanelTitle({children}:{children:React.ReactNode}){return <h2 className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-black"><span className="text-red-400">✦</span>{children}</h2>}
export default function WeatherDashboard(){
 const [city,setCity]=useState("Malatya"),[query,setQuery]=useState("Malatya"),[data,setData]=useState<WeatherData|null>(null),[regional,setRegional]=useState<Array<{name:string;temperature:number;code:number;lat:number;lon:number}>>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[lastUpdated,setLastUpdated]=useState(""),[busy,setBusy]=useState(false),[coords,setCoords]=useState<{lat:number;lon:number}|null>(null);
 const load=useCallback(async(name:string)=>{
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/weather?city="+encodeURIComponent(name),{cache:"no-store"});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Hava durumu verisi alınamadı.");
   setData(d);setCoords({lat:p.coords.latitude,lon:p.coords.longitude});setCity(d.location.name);setQuery(d.location.name);setLastUpdated(new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}));
  }catch(e){setError(e instanceof Error?e.message:"Meteoroloji bağlantısı kurulamadı.");}
  finally{setLoading(false);}
 },[]);
 const loadRegional=useCallback(async()=>{
  const values=await Promise.all(cities.map(async c=>{try{const r=await fetch("/api/weather?lat="+c.lat+"&lon="+c.lon+"&name="+encodeURIComponent(c.name),{cache:"no-store"});if(!r.ok)return null;const d=await r.json();return {name:c.name,temperature:Math.round(d.current.temperature_2m),code:d.current.weather_code,lat:c.lat,lon:c.lon};}catch{return null;}}));
  setRegional(values.filter(Boolean) as Array<{name:string;temperature:number;code:number;lat:number;lon:number}>);
 },[]);
 useEffect(()=>{void load("Malatya");void loadRegional();const id=window.setInterval(()=>{void load(city);void loadRegional();},600000);return()=>clearInterval(id)},[load,loadRegional]);
 const refresh=()=>{void load(city);void loadRegional();};
 const search=(e:FormEvent)=>{e.preventDefault();if(query.trim())void load(query.trim());};
 const locate=()=>{
  if(!navigator.geolocation){setError("Bu tarayıcı konum özelliğini desteklemiyor.");return;}
  setBusy(true);navigator.geolocation.getCurrentPosition(async p=>{try{const r=await fetch("/api/weather?lat="+p.coords.latitude+"&lon="+p.coords.longitude+"&name="+encodeURIComponent("Konumum"),{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);setCity(d.location.name);setQuery(d.location.name);setLastUpdated(new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}));setError("");}catch(e){setError(e instanceof Error?e.message:"Konum hava durumu alınamadı.");}finally{setBusy(false);}},()=>{setError("Konum izni verilmedi veya konum alınamadı.");setBusy(false);},{enableHighAccuracy:false,timeout:9000,maximumAge:300000});
 };
 const current=data?.current,daily=data?.daily,hourly=data?.hourly;\n const moonInfo=useMemo(()=>{const cycle=29.530588853,known=Date.UTC(2000,0,6,18,14),age=((Date.now()-known)/86400000%cycle+cycle)%cycle,phase=age/cycle;const names=["Yeni Ay","Hilal","İlk Dördün","Şişkin Ay","Dolunay","Küçülen Ay","Son Dördün","Hilal"];return {name:names[Math.floor(phase*8)%8],illumination:Math.round((1-Math.cos(2*Math.PI*phase))*50)}},[lastUpdated]);
 const hours=useMemo(()=>hourly?hourly.time.map((t,i)=>({time:t,temp:hourly.temperature_2m[i],rain:hourly.precipitation_probability[i],code:hourly.weather_code[i]})).filter(x=>new Date(x.time).getTime()>=Date.now()).slice(0,12):[],[hourly]);
 const dailyRows=useMemo(()=>daily?daily.time.map((t,i)=>({date:t,code:daily.weather_code[i],max:daily.temperature_2m_max[i],min:daily.temperature_2m_min[i],sunrise:daily.sunrise[i],sunset:daily.sunset[i],uv:daily.uv_index_max[i],rain:daily.precipitation_probability_max[i]})):[],[daily]);
 return <main className="min-h-screen overflow-hidden bg-[#050507] text-white">
  <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_55%_-15%,rgba(205,0,35,.19),transparent_48%),linear-gradient(115deg,transparent,rgba(255,0,30,.018),transparent)]"/>
  <div className="relative mx-auto max-w-[1680px] px-3 pb-10 sm:px-5">
   <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-red-500/25 py-3 sm:py-4">
    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_18px_red]"/>
    <Link href="/" className="flex min-w-0 items-center gap-3"><img src="/cnr-logo.webp" alt="CNR Müzik TV" className="h-[55px] w-[205px] object-contain object-left sm:h-[66px] sm:w-[260px]"/><span className="hidden h-12 w-px bg-red-500 shadow-[0_0_12px_red] sm:block"/><div className="hidden sm:block"><h1 className="text-2xl font-black tracking-tight sm:text-3xl">HAVA DURUMU</h1><p className="text-[10px] text-zinc-400">Türkiye ve Dünya Geneli Güncel Hava Durumu</p></div></Link>
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
     <form onSubmit={search} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/25 bg-black/60 px-4 sm:w-[280px] sm:flex-none"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şehir ara..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-500"/><button aria-label="Şehir ara"><Search size={17}/></button></form>
     <button onClick={locate} disabled={busy} title="Konumumu kullan" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/50 text-zinc-200 hover:border-red-400"><LocateFixed size={17}/></button>
     <button onClick={refresh} disabled={loading} title="Verileri yenile" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/50 text-zinc-200 hover:border-red-400"><RefreshCw size={16} className={loading?"animate-spin":""}/></button>
    </div>
   </header>
   <nav className="flex items-center gap-2 overflow-x-auto border-b border-white/10 py-3 text-[10px] font-bold text-zinc-300">
    <Link href="/" className="shrink-0 hover:text-white">Ana Sayfa</Link><span className="text-zinc-600">›</span><Link href="/haberler" className="shrink-0 hover:text-white">Haberler</Link><span className="text-zinc-600">›</span><span className="shrink-0 text-white">Hava Durumu</span><span className="ml-auto hidden shrink-0 items-center gap-2 text-[9px] text-emerald-300 sm:flex"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"/> CANLI METEOROLOJİ</span>
   </nav>
   <div className="my-4 flex flex-wrap items-center justify-between gap-2"><div><div className="text-[9px] font-black tracking-[.22em] text-red-400">CNR MÜZİK TV® · METEOROLOJİ MERKEZİ</div><h2 className="mt-1 text-2xl font-black sm:text-3xl">Hava Durumu</h2><p className="mt-1 text-[11px] text-zinc-400">Gerçek zamanlı gözlem ve 7 günlük tahmin · {data?.location.name||city}</p></div><div className="flex items-center gap-2 text-[9px] text-zinc-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/>{lastUpdated?"Son güncelleme: "+lastUpdated:"Veri bekleniyor"}</div></div>
   {error&&<div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">{error}</div>}
   <div className="grid gap-3 xl:grid-cols-[minmax(0,1.72fr)_minmax(280px,1fr)]">
    <div className="grid min-w-0 gap-3">
     <Panel className="relative overflow-hidden p-4 sm:p-5"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,100,75,.19),transparent_48%),linear-gradient(115deg,rgba(120,0,20,.35),transparent_65%)]"/><div className="relative flex flex-wrap items-center justify-between gap-2"><div className="rounded-full border border-red-400/40 bg-red-700/80 px-4 py-2 text-xs font-black shadow-[0_0_20px_rgba(230,0,30,.25)]"><MapPin size={14} className="mr-1 inline"/> {data?.location.name||city} <ChevronDown size={14} className="ml-2 inline"/></div><div className="text-[9px] text-zinc-400">Gözlem · {current?timeLabel(current.time):"--:--"}</div></div>
      <div className="relative mt-5 grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(190px,.85fr)]"><div className="flex items-center gap-3 sm:gap-5"><div className="weather-icon-float"><WeatherIcon code={current?.weather_code??3} size={76}/></div><div><div className="text-6xl font-black leading-none tracking-[-.06em] sm:text-7xl">{current?Math.round(current.temperature_2m):"—"}°<span className="text-3xl">C</span></div><div className="mt-2 text-sm font-bold">{current?weatherText(current.weather_code):loading?"Veri yükleniyor":"Veri yok"}</div><div className="mt-1 text-[11px] text-zinc-300">Hissedilen {current?Math.round(current.apparent_temperature)+"°":"—"}</div></div></div>
       <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-[10px]"><div className="flex items-center gap-2"><Wind className="text-sky-300" size={17}/><span className="text-zinc-400">Rüzgâr<br/><b className="text-sm text-white">{current?Math.round(current.wind_speed_10m)+" km/sa":"—"}</b></span></div><div className="flex items-center gap-2"><Droplets className="text-sky-300" size={17}/><span className="text-zinc-400">Nem<br/><b className="text-sm text-white">{current?"%"+current.relative_humidity_2m:"—"}</b></span></div><div className="flex items-center gap-2"><Gauge className="text-amber-200" size={17}/><span className="text-zinc-400">Basınç<br/><b className="text-sm text-white">{current?Math.round(current.surface_pressure)+" hPa":"—"}</b></span></div><div className="flex items-center gap-2"><Droplets className="text-cyan-200" size={17}/><span className="text-zinc-400">Yağış<br/><b className="text-sm text-white">{current?current.precipitation+" mm":"—"}</b></span></div></div>
      </div><div className="relative mt-5 flex flex-wrap gap-4 border-t border-white/10 pt-3 text-[10px] text-zinc-300"><span className="flex items-center gap-2"><Sunrise size={16} className="text-amber-300"/> Gün doğumu <b className="text-white">{dailyRows[0]?.sunrise?timeLabel(dailyRows[0].sunrise):"—"}</b></span><span className="flex items-center gap-2"><Sunset size={16} className="text-orange-300"/> Gün batımı <b className="text-white">{dailyRows[0]?.sunset?timeLabel(dailyRows[0].sunset):"—"}</b></span><span className="flex items-center gap-2"><Activity size={16} className="text-red-300"/> UV <b className="text-white">{dailyRows[0]?.uv??"—"}</b></span></div>
     </Panel>
     <Panel className="overflow-hidden"><PanelTitle><ClockIcon/> Saatlik Tahmin</PanelTitle><div className="flex gap-2 overflow-x-auto p-3">{hours.length?hours.map((h,i)=><div key={h.time} className={"min-w-[67px] flex-1 rounded-lg border p-2 text-center "+(i===0?"border-red-400/60 bg-red-700/30":"border-white/10 bg-black/30")}><div className="text-[9px] font-bold text-zinc-300">{i===0?"Şu an":timeLabel(h.time)}</div><div className="my-2 flex justify-center"><WeatherIcon code={h.code} size={25}/></div><div className="text-sm font-black">{Math.round(h.temp)}°</div><div className="mt-1 text-[8px] text-sky-300">💧 {h.rain??0}%</div></div>):<p className="p-4 text-xs text-zinc-500">Saatlik tahmin yükleniyor…</p>}</div></Panel>
     <Panel className="overflow-hidden"><PanelTitle><CalendarDays size={17} className="text-red-400"/> 7 Günlük Tahmin</PanelTitle><div className="divide-y divide-white/10">{dailyRows.map((d,i)=><div key={d.date} className="grid grid-cols-[minmax(0,1fr)_40px_50px_60px] items-center gap-2 px-4 py-2.5 text-[10px]"><span className="font-semibold capitalize">{i===0?"Bugün":dayLabel(d.date)}</span><WeatherIcon code={d.code} size={22}/><span className="text-right text-zinc-400">💧 {d.rain??0}%</span><span className="text-right font-black">{Math.round(d.max)}° <span className="font-medium text-zinc-500">{Math.round(d.min)}°</span></span></div>)}</div></Panel>
    </div>
    <aside className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
     <Panel className="overflow-hidden"><PanelTitle><Globe2 size={17} className="text-red-400"/> Türkiye Geneli</PanelTitle><div className="relative p-3"><svg viewBox="0 0 460 220" className="w-full" role="img" aria-label="Türkiye şehirleri hava durumu haritası"><defs><linearGradient id="trWeatherFill" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#fa252e"/><stop offset="1" stopColor="#65000d"/></linearGradient><filter id="trGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M22 88 L42 65 74 70 94 50 124 62 148 48 178 62 202 44 226 57 248 43 270 62 296 54 316 71 342 62 362 81 389 76 418 98 438 113 421 133 395 138 379 158 351 151 331 169 305 157 281 177 251 161 230 177 207 162 181 179 157 161 130 173 107 154 82 164 61 142 38 144 22 119 Z" fill="url(#trWeatherFill)" stroke="#ff6874" strokeWidth="2" filter="url(#trGlow)" opacity=".95"/>{regional.map((c,i)=>{const x=20+((c.lon-26)/20)*410,y=35+((42.5-c.lat)/7)*145;return <g key={c.name}><circle cx={x} cy={y} r="9" fill="#ffd54a" opacity=".25"/><circle cx={x} cy={y} r="4" fill="#fff"/><text x={x} y={y+19} fontSize="9" textAnchor="middle" fill="#fff">{c.name}</text></g>})}</svg><div className="mt-2 grid grid-cols-2 gap-2">{regional.map(c=><div key={c.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[9px]"><span className="text-zinc-300">{c.name}</span><span className="flex items-center gap-1"><WeatherIcon code={c.code} size={15}/><b>{c.temperature}°</b></span></div>)}</div></div></Panel>
     <Panel className="overflow-hidden"><PanelTitle><Sun size={17} className="text-amber-300"/> Gün Işığı & Ay</PanelTitle><div className="grid grid-cols-2 gap-2 p-3"><div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center"><Sunrise className="mx-auto text-amber-300" size={26}/><div className="mt-2 text-xl font-black">{dailyRows[0]?.sunrise?timeLabel(dailyRows[0].sunrise):"—"}</div><div className="text-[9px] text-zinc-400">Gün doğumu</div></div><div className="rounded-lg border border-white/10 bg-black/30 p-3 text-center"><Sunset className="mx-auto text-orange-300" size={26}/><div className="mt-2 text-xl font-black">{dailyRows[0]?.sunset?timeLabel(dailyRows[0].sunset):"—"}</div><div className="text-[9px] text-zinc-400">Gün batımı</div></div></div><div className="flex items-center gap-3 border-t border-white/10 p-3"><Moon size={31} className="text-slate-200"/><div><b className="text-xs">{moonInfo.name}</b><p className="text-[9px] text-zinc-400">Yaklaşık aydınlanma %{moonInfo.illumination}</p></div></div></Panel>
     <Panel className="overflow-hidden"><PanelTitle><Thermometer size={17} className="text-red-400"/> Meteoroloji Bilgisi</PanelTitle><div className="space-y-2 p-3 text-[10px]"><div className="flex justify-between"><span className="text-zinc-400">Veri sağlayıcı</span><b>Open-Meteo</b></div><div className="flex justify-between"><span className="text-zinc-400">Güncelleme aralığı</span><b>10 dakika</b></div><div className="flex justify-between"><span className="text-zinc-400">Konum</span><b>{data?.location.name||city}</b></div><div className="flex justify-between"><span className="text-zinc-400">Durum</span><b className="text-emerald-300">Bağlantı {data?"aktif":"bekleniyor"}</b></div><p className="border-t border-white/10 pt-2 text-[9px] leading-4 text-zinc-500">Tahminler küresel sayısal hava tahmin modellerinden alınır. Acil meteorolojik uyarılar için resmî MGM duyurularını takip edin.</p></div></Panel>
    </aside>
   </div>
   <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 py-4 text-[9px] text-zinc-500"><span>CNR MÜZİK TV® · METEOROLOJİ MERKEZİ</span><span>Kaynak: Open-Meteo · {data?.location.timezone||"Yerel saat"} · Son kontrol {lastUpdated||"—"}</span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-red-300 hover:text-white">Veri kaynağı</a></footer>
  </div>
 </main>
}
function ClockIcon(){return <Activity size={17} className="text-red-400"/>}
