"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "recovery" | "updatePassword";

export default function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = params.get("next") || "/hesabim";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/hesabim";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Şifre en az 8 karakter olmalı.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(next),
            data: { full_name: fullName.trim(), username: username.trim().toLowerCase() }
          }
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setMessage("Kayıt isteğin alındı. E-posta adresine gelen doğrulama bağlantısını açarak hesabını etkinleştir.");
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else if (mode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent("/sifre-yenile")
        });
        if (error) throw error;
        setMessage("Şifre yenileme bağlantısı e-posta adresine gönderildi.");
      } else {
        if (password.length < 8) throw new Error("Yeni şifre en az 8 karakter olmalı.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Şifren güncellendi. Hesabına yönlendiriliyorsun.");
        window.setTimeout(() => { router.replace("/hesabim"); router.refresh(); }, 700);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem tamamlanamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Tekrar hoş geldin" : mode === "signup" ? "CNR ailesine katıl" : mode === "recovery" ? "Şifreni yenile" : "Yeni şifreni belirle";
  const description = mode === "login" ? "Hesabına güvenli şekilde giriş yap." : mode === "signup" ? "Yeni üyeliğini oluştur. Doğrulama e-postası gönderilecek." : mode === "recovery" ? "Kayıtlı e-posta adresini gir." : "Hesabın için yeni bir şifre belirle.";
  return (
    <section className="cnr-auth-layout">
      <div className="cnr-auth-aside">
        <span className="cnr-auth-kicker">CNR MÜZİK TV · MEMBER ACCESS</span>
        <h1>Sesini<br/><em>duyur.</em></h1>
        <p>Kişisel müzik koleksiyonun, yayın deneyimin ve CNR hesabın tek yerde.</p>
        <div className="cnr-auth-signal"><i/> CNR DIGITAL BROADCAST NETWORK</div>
      </div>
      <div className="cnr-auth-panel">
        <div className="cnr-auth-brand"><span>CNR</span><small>MÜZİK TV®</small></div>
        <div className="cnr-auth-title"><span>GÜVENLİ ÜYE ALANI</span><h2>{title}</h2><p>{description}</p></div>
        <form onSubmit={submit} className="cnr-auth-form">
          {mode === "signup" && <>
            <label>Ad soyad<input value={fullName} onChange={e=>setFullName(e.target.value)} required maxLength={80} autoComplete="name" placeholder="Adın ve soyadın"/></label>
            <label>Kullanıcı adı<input value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoComplete="username" placeholder="kullanici_adi"/></label>
          </>}
          {(mode !== "updatePassword") && <label>E-posta<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="ornek@eposta.com"/></label>}
          {mode !== "recovery" && <label>{mode === "updatePassword" ? "Yeni şifre" : "Şifre"}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="En az 8 karakter"/></label>}
          {error && <p className="cnr-auth-error" role="alert">{error}</p>}
          {message && <p className="cnr-auth-success" role="status">{message}</p>}
          <button type="submit" disabled={busy}>{busy ? "İŞLENİYOR…" : mode === "login" ? "GİRİŞ YAP" : mode === "signup" ? "HESAP OLUŞTUR" : mode === "recovery" ? "YENİLEME BAĞLANTISI GÖNDER" : "ŞİFREYİ GÜNCELLE"}</button>
        </form>
        <div className="cnr-auth-links">
          {mode === "login" ? <><button onClick={()=>setMode("recovery")}>Şifremi unuttum</button><span>Hesabın yok mu? <button onClick={()=>setMode("signup")}>Üye ol</button></span></> :
           mode === "signup" ? <span>Hesabın var mı? <button onClick={()=>setMode("login")}>Giriş yap</button></span> :
           mode === "recovery" ? <span>Hatırladın mı? <button onClick={()=>setMode("login")}>Girişe dön</button></span> :
           <span><Link href="/hesabim">Hesabıma dön</Link></span>}
        </div>
        <Link href="/" className="cnr-auth-home">← Ana sayfaya dön</Link>
        <small className="cnr-auth-legal">Devam ederek CNR Müzik TV kullanım koşullarını ve gizlilik politikasını kabul etmiş olursun.</small>
      </div>
    </section>
  );
}
