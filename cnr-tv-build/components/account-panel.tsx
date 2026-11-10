"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile={id:string;username:string|null;full_name:string;avatar_url:string|null;bio:string;role:string;is_public:boolean;created_at:string}|null;
export default function AccountPanel({profile}:{profile:Profile}){
 const router=useRouter();const[fullName,setFullName]=useState(profile?.full_name||"");const[username,setUsername]=useState(profile?.username||"");const[bio,setBio]=useState(profile?.bio||"");const[isPublic,setIsPublic]=useState(profile?.is_public||false);const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");const[error,setError]=useState("");const[email,setEmail]=useState("");
 useEffect(()=>{let active=true;createClient().auth.getUser().then(({data})=>{if(active)setEmail(data.user?.email||"")});return()=>{active=false}},[]);
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setMessage("");try{const supabase=createClient();const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error("Oturum doğrulanamadı. Yeniden giriş yap.");const{error:saveError}=await supabase.from("profiles").update({full_name:fullName.trim(),username:username.trim().toLowerCase()||null,bio:bio.trim(),is_public:isPublic,updated_at:new Date().toISOString()}).eq("id",user.id);if(saveError)throw saveError;setMessage("Profil bilgilerin kaydedildi.");router.refresh()}catch(err){setError(err instanceof Error?err.message:"Profil kaydedilemedi.")}finally{setBusy(false)}}
 async function signOut(){setBusy(true);setError("");try{const{error}=await createClient().auth.signOut();if(error)throw error;router.replace("/");router.refresh()}catch(err){setError(err instanceof Error?err.message:"Çıkış yapılamadı.")}finally{setBusy(false)}}
 return <div className="cnr-member-shell">
  <header className="cnr-member-head"><div><span className="cnr-auth-kicker">CNR DIGITAL · MEMBER AREA</span><h1>Hesabım</h1><p>Üyeliğini ve kişisel profilini buradan yönet.</p></div><span className="cnr-member-role">{profile?.role==="admin"?"YÖNETİCİ":profile?.role==="editor"?"EDİTÖR":profile?.role==="artist"?"SANATÇI":"CNR ÜYESİ"}</span></header>
  <div className="cnr-member-grid">
   <aside className="cnr-member-card"><div className="cnr-member-avatar">{(fullName||email||"C").trim().slice(0,1).toUpperCase()}</div><span className="cnr-auth-kicker">AKTİF OTURUM</span><h2>{fullName||"CNR Üyesi"}</h2><p>{email}</p><small>@{username||"kullanici"}</small><div className="cnr-member-card-actions"><Link href="/">Yayına dön ↗</Link><button onClick={signOut} disabled={busy}>Güvenli çıkış</button></div></aside>
   <section className="cnr-member-form-card"><div className="cnr-auth-title"><span>PROFİL YÖNETİMİ</span><h2>Kişisel bilgilerin</h2><p>Buradaki bilgiler hesabına bağlı olarak saklanır.</p></div>
    <form onSubmit={save} className="cnr-auth-form"><label>Ad soyad<input value={fullName} onChange={e=>setFullName(e.target.value)} required maxLength={80} autoComplete="name"/></label><label>Kullanıcı adı<input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="kullanici_adi"/></label><label>E-posta<input value={email} disabled readOnly/></label><label>Kısa biyografi<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={4} placeholder="Kendinden ve müzik zevkinden bahset."/></label>
     <label className="cnr-member-switch"><span><b>Herkese açık profil</b><small>Etkinleştirirsen üyelik profilin herkese görünür.</small></span><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)}/></label>
     {error&&<p className="cnr-auth-error" role="alert">{error}</p>}{message&&<p className="cnr-auth-success" role="status">{message}</p>}<button type="submit" disabled={busy}>{busy?"KAYDEDİLİYOR…":"DEĞİŞİKLİKLERİ KAYDET"}</button>
    </form><p className="cnr-member-security">Güvenlik notu: Üyelik rolü ve yönetici yetkileri bu ekrandan değiştirilemez.</p>
   </section>
  </div>
 </div>
}
