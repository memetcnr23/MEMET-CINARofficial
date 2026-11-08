import Link from "next/link";

type LegalSection = { title: string; body: string };
export default function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <main style={{minHeight:"100vh",background:"#08080b",color:"#f5f5f7",padding:"36px 20px",fontFamily:"Inter,Arial,sans-serif"}}>
    <article style={{maxWidth:900,margin:"0 auto",border:"1px solid rgba(255,255,255,.12)",borderRadius:18,background:"#111116",padding:"clamp(22px,5vw,48px)"}}>
      <Link href="/" style={{color:"#ff6477",fontWeight:800,textDecoration:"none"}}>← CNR MÜZİK TV</Link>
      <p style={{color:"#ff6477",letterSpacing:2,fontSize:11,fontWeight:800,marginTop:32}}>CNR MÜZİK YAPIM® · YASAL BİLGİLENDİRME</p>
      <h1 style={{fontSize:"clamp(30px,5vw,44px)",lineHeight:1.1,margin:"10px 0 14px"}}>{title}</h1>
      <p style={{color:"#c3c3cc",lineHeight:1.8,fontSize:15}}>{intro}</p>
      {sections.map((section)=><section key={section.title} style={{marginTop:28}}>
        <h2 style={{fontSize:19,marginBottom:8}}>{section.title}</h2>
        <p style={{color:"#b7b7c2",lineHeight:1.85,whiteSpace:"pre-line",margin:0}}>{section.body}</p>
      </section>)}
      <p style={{borderTop:"1px solid rgba(255,255,255,.1)",paddingTop:20,marginTop:34,color:"#777783",fontSize:12}}>Son güncelleme: 8 Kasım 2026 · Bu metin genel bilgilendirme taslağıdır; yayına almadan önce işletmenin gerçek uygulamaları ve hukuki yükümlülükleri bakımından gözden geçirilmelidir.</p>
    </article>
  </main>;
}
