// ------------------ LONCA AI BAĞLANTISI ------------------ //

// Eğer localhost'ta çalışıyorsan: http://localhost:3000/lonca-ai
// Eğer Vercel'deki siteyi kullanıyorsan: https://memet-cinar-official-tpeh.vercel.app/api/lonca-ai

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// LOCAL'de Express server.js çalışırken ↓
const LOCAL_BASE = "http://localhost:3000";
const LOCAL_PATH = "/lonca-ai";

// VERCEL canlı sitede (Next.js / serverless) iken ↓
const LIVE_BASE = "https://memet-cinar-official-tpeh.vercel.app";
const LIVE_PATH = "/api/lonca-ai";

// Kullanılacak adresi otomatik seç
const API_BASE = isLocal ? LOCAL_BASE : LIVE_BASE;
const API_PATH = isLocal ? LOCAL_PATH : LIVE_PATH;


// ------------------ CHAT MESAJ GÖSTERME ------------------ //

function appendUserMessage(text) {
  const box = document.getElementById("chat-history");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "msg out";
  div.textContent = text;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendAiMessage(text) {
  const box = document.getElementById("chat-history");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "msg in ai-msg";

  const span = document.createElement("span");
  span.textContent = text;

  const btn = document.createElement("button");
  btn.className = "msg-copy-btn";
  btn.textContent = "Kopyala";
  btn.addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "Kopyalandı";
        setTimeout(() => (btn.textContent = "Kopyala"), 1000);
      });
    }
  });

  div.appendChild(span);
  div.appendChild(btn);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}


// ------------------ BACKEND'E İSTEK (server.js ile) ------------------ //

async function loncaAiRequest(promptText) {
  try {
    const res = await fetch(API_BASE + API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: promptText }),
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const data = await res.json();
    if (data && data.answer) {
      return data.answer;
    }

    return "Sunucudan boş yanıt geldi.";
  } catch (err) {
    console.error("Lonca AI hata:", err);
    return "Lonca yapay zekâ sunucusuna bağlanırken bir hata oluştu. " +
           "server.js'in çalıştığından ve OPENAI_API_KEY ayarlı olduğundan emin ol.";
  }
}


// ------------------ GÖNDER BUTONU / ENTER TUŞU ------------------ //

async function sendMsg() {
  const inp = document.getElementById("chat-in");
  const box = document.getElementById("chat-history");
  if (!inp || !box) return;

  const txt = inp.value.trim();
  if (!txt) return;

  // Kullanıcı mesajını ekle
  appendUserMessage(txt);
  inp.value = "";
  box.scrollTop = box.scrollHeight;

  // Yükleniyor balonu
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg in ai-msg";
  loadingDiv.textContent = "Yükleniyor...";
  box.appendChild(loadingDiv);
  box.scrollTop = box.scrollHeight;

  // Backend'e istek
  const ans = await loncaAiRequest(txt);

  // Yükleniyor balonunu kaldır, gerçek cevabı ekle
  box.removeChild(loadingDiv);
  appendAiMessage(ans);
}

// Enter ile gönderme
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("chat-in");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMsg();
    }
  });
});
