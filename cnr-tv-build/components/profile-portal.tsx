"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const inputClass = "mt-2 h-12 w-full border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/10";
  return <main className="relative mx-auto max-w-5xl px-4 py-8 text-white sm:px-7 sm:py-12">
    <div className="pointer-events-none absolute right-8 top-0 h-64 w-64 rounded-full bg-red-600/10 blur-[100px]"/>
    <div className="relative grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <section className="border border-red-500/20 bg-gradient-to-br from-[#241017] via-[#111116] to-[#09090d] p-7 sm:p-9">
        <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.22em] text-rose-300"><Sparkles size={14}/> CNR MEMBER AREA</span>
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Müziğin<br/><span className="text-rose-400">bir parçası ol.</span></h1>
        <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-400">CNR Müzik TV hesabınla profilini oluştur, sanatçı kimliğini düzenle ve topluluğa katıl.</p>
        <div className="mt-10 space-y-4 text-xs text-zinc-300">
          <div className="flex items-center gap-3"><ShieldCheck className="text-rose-400" size={18}/> E-posta doğrulamalı hesap sistemi</div>
          <div className="flex items-center gap-3"><CircleUserRound className="text-rose-400" size={18}/> Kişisel profil ve biyografi</div>
          <div className="flex items-center gap-3"><KeyRound className="text-rose-400" size={18}/> Güvenli oturum ve hesap yönetimi</div>
        </div>
      </section>

      <section className="border border-white/10 bg-[#101015]/95 p-6 shadow-2xl sm:p-8">
        {!configured ? <div className="py-14 text-center"><ShieldCheck className="mx-auto mb-4 text-amber-300" size={34}/><h2 className="text-xl font-black">Üyelik kurulumu bekliyor</h2><p className="mx-auto mt-3 max-w-sm text-sm text-zinc-400">Vercel üzerinde NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tanımlandığında kayıt ve giriş ekranı etkinleşir.</p></div> :
        user ? <><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black tracking-[.2em] text-rose-300">HESABIM</span><h2 className="mt-2 text-2xl font-black">Hoş geldin.</h2><p className="mt-1 text-xs text-zinc-500">{user.email}</p></div><span className="grid h-12 w-12 place-items-center border border-rose-400/20 bg-rose-500/10 text-rose-300"><UserRound/></span></div>
          <form onSubmit={saveProfile} className="mt-7 space-y-4">
            <label className="block text-xs font-bold text-zinc-300">Ad soyad<input className={inputClass} maxLength={80} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Adın soyadın"/></label>
            <label className="block text-xs font-bold text-zinc-300">Kullanıcı adı<input className={inputClass} maxLength={24} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="ornek_kullanici"/></label>
            <label className="block text-xs font-bold text-zinc-300">Biyografi<textarea className="mt-2 min-h-28 w-full border border-white/10 bg-black/35 p-4 text-sm outline-none focus:border-red-400/60" maxLength={500} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Kendinden kısaca bahset..."/></label>
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-800 text-xs font-black tracking-widest disabled:opacity-50">{busy?<LoaderCircle className="animate-spin" size={16}/>:<CheckCircle2 size={16}/>} PROFİLİ KAYDET</button>
          </form>
          <button onClick={signOut} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 border border-white/10 py-3 text-xs font-bold text-zinc-400 hover:text-white"><LogOut size={15}/> Güvenli çıkış</button>
        </> :
        <>
          <div className="mb-6"><span className="text-[10px] font-black tracking-[.2em] text-rose-300">CNR ACCOUNT</span><h2 className="mt-2 text-2xl font-black">{mode==="login"?"Hesabına giriş yap":"Yeni hesap oluştur"}</h2><p className="mt-2 text-xs text-zinc-500">E-posta ve şifrenle güvenli şekilde devam et.</p></div>
          <div className="mb-6 grid grid-cols-2 border border-white/10 p-1"><button type="button" onClick={()=>{setMode("login");setError("");setMessage("");}} className={"py-3 text-xs font-black "+(mode==="login"?"bg-red-700 text-white":"text-zinc-500")}>GİRİŞ YAP</button><button type="button" onClick={()=>{setMode("signup");setError("");setMessage("");}} className={"py-3 text-xs font-black "+(mode==="signup"?"bg-red-700 text-white":"text-zinc-500")}>KAYIT OL</button></div>
          <form onSubmit={submitAuth} className="space-y-4">
            {mode==="signup"&&<label className="block text-xs font-bold text-zinc-300">Ad soyad<input className={inputClass} value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={80} required placeholder="Adın soyadın"/></label>}
            <label className="block text-xs font-bold text-zinc-300"><span className="inline-flex items-center gap-2"><Mail size={14}/> E-posta adresi</span><input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com"/></label>
            <label className="block text-xs font-bold text-zinc-300"><span className="inline-flex items-center gap-2"><KeyRound size={14}/> Şifre</span><input className={inputClass} type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="En az 8 karakter"/></label>
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-800 text-xs font-black tracking-widest disabled:opacity-50">{busy?<LoaderCircle className="animate-spin" size={16}/>:<ArrowRight size={16}/>} {mode==="login"?"GİRİŞ YAP":"ÜCRETSİZ HESAP OLUŞTUR"}</button>
          </form>
        </>}
        {error&&<p role="alert" className="mt-4 border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
        {message&&<p role="status" className="mt-4 flex items-start gap-2 border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200"><CheckCircle2 size={15} className="shrink-0"/>{message}</p>}
      </section>
    </div>
  </main>;
}
