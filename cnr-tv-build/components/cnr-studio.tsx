"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight,
  CloudSun, Disc3, Headphones, Home, Info, ListMusic, Menu, Mic2,
  MonitorPlay, Music2, Newspaper, Play, Radio, Search, Signal,
  Sparkles, Trophy, Users, Volume2, X
} from "lucide-react";

type Clip = { id: string; title: string; artist: string; category: string; durationSeconds: number };
type Feed = { clips?: Clip[]; current?: { clip: Clip }; upcoming?: Array<{ clip: Clip }>; error?: string };
const nav = [
  ["/", "Ana Sayfa", Home], ["/canli-yayin", "Canlı Yayın", Radio],
  ["/yayin-akisi", "Yayın Akışı", CalendarDays], ["/programlar", "Programlar", MonitorPlay],
  ["/muzik-listeleri", "Müzik Listeleri", ListMusic], ["/sanatcilar", "Sanatçılar", Users],
  ["/klip-arsivi", "Klip Arşivi", Disc3], ["/haberler", "Haber Merkezi", Newspaper],
  ["/hava-durumu", "Hava Durumu", CloudSun], ["/etkinlikler", "Etkinlikler", Trophy],
  ["/istatistikler", "İstatistikler", Activity], ["/hakkimizda", "Hakkımızda", Info]
] as const;
const schedule = [
  ["08:00", "Güne Müzikle Başla", "Sabah kuşağı", "Günün enerjisi"],
  ["10:00", "CNR Türkçe Pop", "Türkçe pop", "En sevilen hitler"],
  ["13:00", "Ritmi Yakala", "Pop & dans", "Temponu yükselt"],
  ["16:00", "CNR Top 20", "Haftanın listesi", "En çok dinlenenler"],
  ["18:00", "Yeni Nesil", "Yeni çıkanlar", "Yeni sesler, yeni keşifler"],
  ["20:00", "Efkar Gecesi", "Duygusal seçki", "Gecenin melodileri"],
  ["22:00", "Gece Frekansı", "Gece kuşağı", "Ritmin geceye karışsın"]
];
const genres = ["Türkçe Pop", "Rap & Trap", "Pop & Dans", "Arabesk", "Akustik", "Global Pop"];
const titles: Record<string,string> = Object.fromEntries(nav.map(([href,label]) => [href,label]));

export default function CnrStudio() {
  const pathname = (usePathname() || "/").replace(/\/$/, "") || "/";
  const [feed, setFeed] = useState<Feed | null>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    const load = () => fetch("/api/now-playing", { cache: "no-store" })
      .then(r => r.json()).then(data => { if (active) setFeed(data); }).catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const clips = feed?.clips || [];
  const current = feed?.current?.clip;
  const filtered = useMemo(() => clips.filter(c =>
    (c.title + " " + c.artist + " " + c.category).toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
  ), [clips, query]);
  const isHome = pathname === "/";
  const pageTitle = titles[pathname] || "CNR Müzik TV";
  const isArchive = pathname === "/klip-arsivi" || pathname === "/muzik-listeleri";
  const isLive = pathname === "/canli-yayin";
  const isSchedule = pathname === "/yayin-akisi";
  const isPrograms = pathname === "/programlar";
  const isArtists = pathname === "/sanatcilar";
  const isNews = pathname === "/haberler";
  const isWeather = pathname === "/hava-durumu";
  const isStats = pathname === "/istatistikler";
  const isAbout = pathname === "/hakkimizda";
  const isEvents = pathname === "/etkinlikler";
  const playClip = (clip: Clip) => { window.location.href = "/canli-yayin?video=" + encodeURIComponent(clip.id); };

  return (
    <main className="cnr-app">
      <header className="cnr-topbar">
        <Link href="/" className="cnr-brand" aria-label="CNR Müzik TV ana sayfa">
          <img src="/cnr-logo.svg" alt="CNR Müzik TV" />
        </Link>
        <div className="cnr-top-center"><span className="cnr-live-dot" /> TÜRKİYE'NİN MÜZİK EKRANI</div>
        <div className="cnr-top-actions">
          <div className="cnr-clock"><span>İSTANBUL</span><b>{now.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</b></div>
          <button className="cnr-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menüyü aç/kapat">{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </header>
      <div className="cnr-shell">
        <aside className={menuOpen ? "cnr-sidebar is-open" : "cnr-sidebar"}>
          <div className="cnr-nav-label">KEŞFET</div>
          <nav>{nav.map(([href,label,Icon]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={pathname === href ? "active" : ""}>
              <Icon size={17}/><span>{label}</span>{pathname === href && <i/>}
            </Link>
          ))}</nav>
          <div className="cnr-sidebar-live">
            <div className="cnr-sidebar-live-head"><span className="cnr-live-dot"/> ŞİMDİ YAYINDA <Signal size={13}/></div>
            <b>{current?.title || "CNR Müzik TV"}</b>
            <span>{current?.artist || "Kesintisiz müzik yayını"}</span>
            <Link href="/canli-yayin">Yayını aç <ArrowUpRight size={14}/></Link>
          </div>
          <div className="cnr-sidebar-bottom"><span>CNR MÜZİK YAPIM®</span><small>© {now.getFullYear()} TÜM HAKLARI SAKLIDIR</small></div>
        </aside>
        <section className="cnr-main">
          <div className="cnr-breadcrumb"><span>CNR MÜZİK TV</span><ChevronRight size={13}/><b>{pageTitle.toLocaleUpperCase("tr")}</b><span className="cnr-system"><i/> SİSTEM AKTİF</span></div>

          {isHome && <>
            <section className="cnr-hero">
              <div className="cnr-hero-content">
                <div className="cnr-eyebrow"><span className="cnr-live-dot"/> 7/24 KESİNTİSİZ MÜZİK</div>
                <h1>RİTMİN<br/><em>MERKEZİ.</em></h1>
                <p>En sevdiğin şarkılar, yeni keşifler ve günün en iyi müzikleri. CNR Müzik TV'de ritim hiç durmaz.</p>
                <div className="cnr-hero-actions">
                  <Link href="/canli-yayin" className="cnr-button-primary"><Play size={15} fill="currentColor"/> CANLI YAYINI İZLE</Link>
                  <Link href="/yayin-akisi" className="cnr-button-ghost">YAYIN AKIŞI <ArrowRight size={15}/></Link>
                </div>
                <div className="cnr-hero-foot"><span><i/> CANLI MÜZİK</span><span>•</span><span>HER AN YENİ BİR KEŞİF</span></div>
              </div>
              <div className="cnr-hero-art" aria-hidden="true">
                <div className="cnr-orbit orbit-one"/><div className="cnr-orbit orbit-two"/>
                <div className="cnr-vinyl"><div className="cnr-vinyl-label">CNR<small>ON AIR</small></div></div>
                <div className="cnr-equalizer"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
                <div className="cnr-art-tag"><span className="cnr-live-dot"/> ON AIR · 24/7</div>
              </div>
            </section>

            <div className="cnr-metrics">
              <div><span>YAYIN DURUMU</span><b><i/> CANLI</b><small>Kesintisiz müzik</small></div>
              <div><span>MÜZİK KATALOĞU</span><b>{clips.length || "—"}</b><small>Listelenen klip</small></div>
              <div><span>YAYIN KALİTESİ</span><b>HD</b><small>Web ve mobil deneyim</small></div>
              <div><span>YEREL SAAT</span><b>{now.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</b><small>Türkiye saati</small></div>
            </div>

            <section className="cnr-section">
              <div className="cnr-section-heading"><div><span>FREKANSINI SEÇ</span><h2>Her ruh hâline bir ritim.</h2></div><Link href="/muzik-listeleri">TÜM LİSTELER <ArrowRight size={14}/></Link></div>
              <div className="cnr-genre-grid">{genres.map((genre,i)=><Link href="/muzik-listeleri" key={genre}><small>0{i+1}</small><b>{genre}</b><ArrowUpRight size={16}/></Link>)}</div>
            </section>

            <section className="cnr-section">
              <div className="cnr-section-heading"><div><span>YAYIN KATALOĞU</span><h2>Şimdi keşfet.</h2></div><Link href="/klip-arsivi">KLİP ARŞİVİ <ArrowRight size={14}/></Link></div>
              <ClipGrid clips={clips.slice(0,8)} onPlay={playClip}/>
            </section>

            <section className="cnr-feature-band">
              <div className="cnr-feature-icon"><Headphones size={27}/></div>
              <div><span>GÜNÜN RİTMİ</span><h2>Bir sonraki favorin burada.</h2><p>Programları keşfet, yayın akışını takip et ve müziğin içinde kal.</p></div>
              <Link href="/programlar">PROGRAMLARI KEŞFET <ArrowRight size={15}/></Link>
            </section>
          </>}

          {isLive && <>
            <PageHeading kicker="CANLI YAYIN MERKEZİ" title="Şu an yayındayız." desc="CNR Müzik TV yayınını buradan takip et. Yayın kataloğu güncellendikçe içerikler yenilenir."/>
            <div className="cnr-player">
              <div className="cnr-player-top"><span><i/> CANLI YAYIN</span><b>CNR MÜZİK TV · ANA YAYIN</b><small>HD</small></div>
              {current ? <iframe key={current.id} src={"https://www.youtube-nocookie.com/embed/"+current.id+"?autoplay=0&mute="+(muted?"1":"0")+"&rel=0&modestbranding=1"} title="CNR Müzik TV yayını" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen/> : <Empty icon={<Radio/>} title={feed?.error || "Yayın kataloğu yükleniyor"} desc="Yayın kaynağı hazır olduğunda oynatıcı burada açılacak."/>}
              <div className="cnr-player-caption"><div><b>{current?.title || "CNR Müzik TV"}</b><span>{current?.artist || "Canlı müzik yayını"}</span></div><button onClick={()=>setMuted(!muted)}><Volume2 size={15}/>{muted?"Sesi aç":"Sesi kapat"}</button></div>
            </div>
            <section className="cnr-section"><div className="cnr-section-heading"><div><span>YAYIN SIRASI</span><h2>Sıradaki parçalar.</h2></div></div><Upcoming items={feed?.upcoming || []}/></section>
          </>}

          {isSchedule && <><PageHeading kicker="PROGRAM REHBERİ" title="Günün yayın akışı." desc="CNR Müzik TV'de gün boyunca seni bekleyen programlar."/><div className="cnr-schedule">{schedule.map((item,i)=><div key={item[0]}><b>{item[0]}</b><div><strong>{item[1]}</strong><span>{item[2]} · {item[3]}</span></div><small>{String(i+1).padStart(2,"0")}</small></div>)}</div></>}
          {isPrograms && <><PageHeading kicker="CNR ORIGINALS" title="Programlarımız." desc="Müziği, keşfi ve eğlenceyi bir araya getiren yayın kuşakları."/><div className="cnr-program-grid">{schedule.map((p,i)=><article key={p[1]}><div className={"cnr-program-art art-"+i}><span>0{i+1}</span><Music2 size={31}/></div><small>PROGRAM 0{i+1}</small><h3>{p[1]}</h3><p>{p[2]} · {p[3]}</p><Link href="/yayin-akisi">YAYIN SAATİNİ GÖR <ArrowRight size={13}/></Link></article>)}</div></>}
          {isArchive && <><PageHeading kicker="MÜZİK KÜTÜPHANESİ" title={pathname==="/muzik-listeleri"?"Listeler ve seçkiler.":"Klip arşivi."} desc="CNR yayın kataloğundaki müzik videolarını keşfet."/><div className="cnr-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şarkı, sanatçı veya kategori ara…"/><small>{filtered.length} SONUÇ</small></div><ClipGrid clips={filtered} onPlay={playClip}/></>}
          {isArtists && <><PageHeading kicker="SANATÇI EVRENİ" title="Sanatçıları keşfet." desc="CNR yayın kataloğunda yer alan sanatçıların müziklerini keşfet."/><div className="cnr-artist-grid">{Array.from(new Set(clips.map(c=>c.artist).filter(Boolean))).slice(0,12).map((artist,i)=><Link href="/klip-arsivi" key={artist}><span>{artist.slice(0,1).toLocaleUpperCase("tr")}</span><div><b>{artist}</b><small>Klip kataloğunu görüntüle</small></div><ArrowUpRight size={15}/></Link>)}</div>{clips.length===0&&<Empty icon={<Mic2/>} title="Sanatçı kataloğu hazırlanıyor" desc="Katalog verileri erişilebilir olduğunda sanatçılar burada listelenecek."/>}</>}
          {isNews && <><PageHeading kicker="CNR HABER" title="Müzik gündemi." desc="Müzik dünyasından haberler ve gelişmeler."/><Empty icon={<Newspaper/>} title="Haber merkezi hazırlanıyor" desc="Doğrulanmış haber akışı bağlandığında güncel içerikler burada yayınlanacak."/></>}
          {isWeather && <><PageHeading kicker="GÜNÜN HAVA DURUMU" title="Hava durumu." desc="Malatya için güncel hava koşulları."/><WeatherPanel/></>}
          {isStats && <><PageHeading kicker="DİJİTAL YAYIN MERKEZİ" title="Kanal istatistikleri." desc="CNR Müzik TV platformunun yayın bilgileri."/><div className="cnr-metrics cnr-metrics-page"><div><span>YAYIN DURUMU</span><b><i/> AKTİF</b><small>Web platformu</small></div><div><span>YAYIN MODELİ</span><b>7/24</b><small>Kesintisiz müzik</small></div><div><span>KLİP KATALOĞU</span><b>{clips.length}</b><small>Listelenen kayıt</small></div><div><span>PLATFORM</span><b>WEB</b><small>Responsive deneyim</small></div></div></>}
          {isAbout && <><PageHeading kicker="BİZ KİMİZ?" title="Müziğin ortak frekansı." desc="CNR Müzik TV, müziği ve yeni keşifleri tek ekranda buluşturan dijital yayın platformudur."/><div className="cnr-about"><img src="/cnr-logo.svg" alt="CNR Müzik TV"/><p>Türkçe poptan rap'e, akustikten global hitlere uzanan bir müzik evreni. Sanatçıları, şarkıları ve müzikseverleri aynı frekansta buluşturuyoruz.</p><b>CNR MÜZİK YAPIM®</b></div></>}
          {isEvents && <><PageHeading kicker="TAKVİM" title="Etkinlikler." desc="CNR Müzik TV etkinlik ve özel yayın takvimi."/><Empty icon={<Trophy/>} title="Etkinlik takvimi hazırlanıyor" desc="Onaylanmış etkinlikler ve özel yayınlar burada duyurulacak."/></>}
          {!isHome && !isLive && !isSchedule && !isPrograms && !isArchive && !isArtists && !isNews && !isWeather && !isStats && !isAbout && !isEvents && <><PageHeading kicker="CNR MÜZİK TV" title="Bu alan hazırlanıyor." desc="Yeni içerikler çok yakında burada."/><Empty icon={<Sparkles/>} title="Yakında burada" desc="Bu bölümün içeriği hazırlanıyor."/></>}

          <footer className="cnr-footer"><img src="/cnr-logo.svg" alt="CNR Müzik TV"/><span>© {now.getFullYear()} CNR Müzik Yapım®. Tüm hakları saklıdır.</span><div><Link href="/hakkimizda">Hakkımızda</Link><Link href="/canli-yayin">Canlı yayın</Link><Link href="/yayin-akisi">Yayın akışı</Link></div></footer>
        </section>
      </div>
      <nav className="cnr-mobile-dock"><Link href="/"><Home size={18}/><span>Ana Sayfa</span></Link><Link href="/canli-yayin"><Radio size={18}/><span>Canlı</span></Link><Link href="/klip-arsivi"><Disc3 size={18}/><span>Arşiv</span></Link><Link href="/yayin-akisi"><CalendarDays size={18}/><span>Akış</span></Link></nav>
    </main>
  );
}

function PageHeading({kicker,title,desc}:{kicker:string;title:string;desc:string}) {
  return <div className="cnr-page-heading"><span>{kicker}</span><h1>{title}</h1><p>{desc}</p></div>;
}
function ClipGrid({clips,onPlay}:{clips:Clip[];onPlay:(c:Clip)=>void}) {
  if(!clips.length) return <Empty icon={<Disc3/>} title="Klip kataloğu hazırlanıyor" desc="Yayın kataloğu erişilebilir olduğunda içerikler burada görüntülenecek."/>;
  return <div className="cnr-clip-grid">{clips.map(c=><article key={c.id}><button onClick={()=>onPlay(c)} aria-label={c.title+" oynat"}><img src={"https://i.ytimg.com/vi/"+c.id+"/hqdefault.jpg"} alt="" loading="lazy"/><span><Play size={17} fill="currentColor"/></span></button><b>{c.title}</b><small>{c.artist}</small></article>)}</div>;
}
function Empty({icon,title,desc}:{icon:ReactNode;title:string;desc:string}) {
  return <div className="cnr-empty">{icon}<b>{title}</b><span>{desc}</span></div>;
}
function Upcoming({items}:{items:Array<{clip:Clip}>}) {
  if(!items.length) return <Empty icon={<CalendarDays/>} title="Yayın sırası güncelleniyor" desc="Sıradaki parçalar yayın kataloğundan otomatik yüklenecek."/>;
  return <div className="cnr-upcoming">{items.slice(0,8).map((item,i)=><div key={item.clip.id+i}><b>{String(i+1).padStart(2,"0")}</b><strong>{item.clip.title}</strong><span>{item.clip.artist}</span></div>)}</div>;
}
function WeatherPanel() {
  const [weather,setWeather]=useState<any>(null);
  useEffect(()=>{let active=true;fetch("https://api.open-meteo.com/v1/forecast?latitude=38.3554&longitude=38.3095&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul").then(r=>r.json()).then(d=>{if(active)setWeather(d)}).catch(()=>{});return()=>{active=false}},[]);
  if(!weather?.current_weather) return <Empty icon={<CloudSun/>} title="Hava verisi alınıyor" desc="Malatya için güncel hava durumu yükleniyor."/>;
  return <div className="cnr-weather"><div><small>MALATYA · ŞU AN</small><b>{Math.round(weather.current_weather.temperature)}°</b><span>Rüzgâr {weather.current_weather.windspeed} km/sa</span></div>{weather.daily.time.slice(0,7).map((day:string,i:number)=><article key={day}><small>{new Date(day+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"short"})}</small><b>{Math.round(weather.daily.temperature_2m_max[i])}°</b><span>{Math.round(weather.daily.temperature_2m_min[i])}°</span></article>)}</div>;
}
