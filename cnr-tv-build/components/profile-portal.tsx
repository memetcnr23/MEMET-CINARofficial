"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { ArrowRight, CheckCircle2, CircleUserRound, KeyRound, LoaderCircle, LogOut, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";

type Profile = { username: string | null; full_name: string; bio: string; role: string; avatar_url: string | null; is_public: boolean };
type SessionUser = { id: string; email: string | null };

export default function ProfilePortal() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  async function loadProfile() {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (!response.ok) { setUser(null); setProfile(null); return; }
    const data = await response.json();
    setUser(data.user);
    setProfile(data.profile);
    setFullName(data.profile?.full_name || "");
    setUsername(data.profile?.username || "");
    setBio(data.profile?.bio || "");
  }

  useEffect(() => {
    try {
      const supabase = createClient();
      void loadProfile();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        if (session) void loadProfile(); else { setUser(null); setProfile(null); }
      });
      return () => subscription.unsubscribe();
    } catch {
      setConfigured(false);
    }
  }, []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin + "/auth/callback?next=/profil" }
        });
        if (authError) throw authError;
        if (data.session) await loadProfile();
        else setMessage("Kayıt alındı. E-posta adresine gelen doğrulama bağlantısına tıkla.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        await loadProfile();
      }
    } catch (e) { setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, full_name: fullName, bio }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profil kaydedilemedi.");
      setProfile(result.profile); setMessage("Profilin başarıyla güncellendi.");
    } catch (e) { setError(e instanceof Error ? e.message : "Profil kaydedilemedi."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setProfile(null); setMessage("Güvenli çıkış yapıldı."); }
    finally { setBusy(false); }
  }

  const inputClass = "cnr-account-input";
  return <main className="cnr-profile-page">
    <div className="cnr-profile-glow cnr-profile-glow-one"/>
    <div className="cnr-profile-glow cnr-profile-glow-two"/>
    <div className="cnr-profile-shell">
      <section className="cnr-profile-hero">
        <div className="cnr-profile-brand"><span className="cnr-profile-brand-icon"><Sparkles size={17}/></span><span>CNR MÜZİK TV® <i>ÜYE MERKEZİ</i></span></div>
        <div className="cnr-profile-hero-copy">
          <span className="cnr-profile-eyebrow">MÜZİĞİN BULUŞMA NOKTASI</span>
          <h1>Müziğin bir parçası <em>ol.</em></h1>
          <p>CNR Müzik TV® topluluğuna katıl. Profilini oluştur, sanatçı kimliğini paylaş ve müzik dünyasındaki yerini al.</p>
        </div>
        <div className="cnr-profile-benefits">
          <div><ShieldCheck/><span><b>Güvenli hesap</b><small>E-posta doğrulamalı üyelik</small></span></div>
          <div><CircleUserRound/><span><b>Kişisel profil</b><small>Adın, kullanıcı adın ve biyografin</small></span></div>
          <div><KeyRound/><span><b>Hesap kontrolü</b><small>Güvenli oturum yönetimi</small></span></div>
        </div>
        <div className="cnr-profile-hero-foot"><span className="cnr-profile-live-dot"/> CNR COMMUNITY <span>•</span> HER SESİN BİR HİKÂYESİ VAR</div>
      </section>

      <section className="cnr-account-card">
        {!configured ? <div className="cnr-account-unavailable"><ShieldCheck size={34}/><span className="cnr-profile-eyebrow">ÜYELİK SİSTEMİ</span><h2>Kurulum bekleniyor</h2><p>Üyelik sistemini etkinleştirmek için Vercel ortam değişkenlerinde NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tanımlanmalıdır.</p></div> :
        user ? <>
          <div className="cnr-account-heading"><div><span className="cnr-profile-eyebrow">CNR ACCOUNT</span><h2>Hoş geldin.</h2><p>{user.email}</p></div><span className="cnr-account-avatar"><UserRound size={25}/></span></div>
          <form onSubmit={saveProfile} className="cnr-account-form">
            <label>Ad soyad<input className={inputClass} maxLength={80} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Adın soyadın"/></label>
            <label>Kullanıcı adı<input className={inputClass} maxLength={24} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="ornek_kullanici"/></label>
            <label>Biyografi<textarea className="cnr-account-input cnr-account-textarea" maxLength={500} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Kendinden ve müziğinden bahset..."/></label>
            <button disabled={busy} className="cnr-account-submit">{busy?<LoaderCircle className="cnr-spin" size={17}/>:<CheckCircle2 size={17}/>} PROFİLİ KAYDET</button>
          </form>
          <button onClick={signOut} disabled={busy} className="cnr-account-logout"><LogOut size={16}/> Güvenli çıkış yap</button>
        </> : <>
          <div className="cnr-account-heading"><div><span className="cnr-profile-eyebrow">CNR ACCOUNT</span><h2>{mode==="login"?"Hesabına giriş yap":"Ailene katıl."}</h2><p>{mode==="login"?"Hesabına güvenle eriş ve müziğe kaldığın yerden devam et.":"Ücretsiz hesabını oluştur, CNR topluluğuna katıl."}</p></div><span className="cnr-account-avatar"><UserRound size={25}/></span></div>
          <div className="cnr-account-tabs"><button type="button" onClick={()=>{setMode("login");setError("");setMessage("");}} className={mode==="login"?"active":""}>GİRİŞ YAP</button><button type="button" onClick={()=>{setMode("signup");setError("");setMessage("");}} className={mode==="signup"?"active":""}>KAYIT OL</button></div>
          <form onSubmit={submitAuth} className="cnr-account-form">
            {mode==="signup"&&<label>Ad soyad<input className={inputClass} value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={80} required placeholder="Adın soyadın"/></label>}
            <label>E-posta adresi<span className="cnr-account-field"><Mail size={17}/><input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com"/></span></label>
            <label>Şifre<span className="cnr-account-field"><KeyRound size={17}/><input className={inputClass} type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="En az 8 karakter"/></span></label>
            <button disabled={busy} className="cnr-account-submit">{busy?<LoaderCircle className="cnr-spin" size={17}/>:<ArrowRight size={17}/>} {mode==="login"?"GİRİŞ YAP":"ÜCRETSİZ HESAP OLUŞTUR"}</button>
          </form>
          <div className="cnr-account-secure"><ShieldCheck size={15}/> Bilgilerin güvenli bağlantıyla korunur.</div>
        </>}
        {error&&<p role="alert" className="cnr-account-alert error">{error}</p>}
        {message&&<p role="status" className="cnr-account-alert success"><CheckCircle2 size={16}/>{message}</p>}
      </section>
    </div>
  </main>;
}
