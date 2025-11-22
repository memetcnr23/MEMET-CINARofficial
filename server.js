// server.js
// Basit Express sunucu: /lonca-ai endpoint'i ile GPT tabanlı lonca asistanı

import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

// .env içini oku
dotenv.config();

// .env içinde OPENAI_API_KEY olmalı
// Örn: OPENAI_API_KEY=sk-.....  (.env dosyasını GİTHUB'A ATMAYACAKSIN)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/lonca-ai", async (req, res) => {
  const userMessage = (req.body && req.body.message) || "";

  if (!userMessage.trim()) {
    return res.json({ answer: "Boş mesaj gönderdin, birkaç kelime daha ekleyebilirsin." });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o", // veya gpt-4o-mini, gpt-4.1 vs.
      messages: [
        {
          role: "system",
          content:
            "Sen Türkçe konuşan, Memet Çınar'ın oyun temalı sitesine özel bir lonca asistanısın. " +
            "Kullanıcıya saygılı, nazik ve net cevaplar ver. Matematik işlemlerini hesapla, " +
            "bilgi sorularını açıkla, şarkı sözü isterse özgün sözler üret. " +
            "Bilinen şarkıların telifli resmi sözlerini asla tam olarak yazma, sadece kısa alıntı veya özet ver.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.8,
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Şu an cevap üretemedim, lütfen tekrar dener misin?";

    res.json({ answer });
  } catch (err) {
    console.error("OpenAI /lonca-ai hata:", err);
    res.status(500).json({
      answer:
        "Sunucu tarafında lonca yapay zekâ ile konuşurken bir hata oluştu. Biraz sonra tekrar dene.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lonca AI sunucusu http://localhost:${PORT} üzerinde çalışıyor`);
});
