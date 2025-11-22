// api/lonca-ai.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const userMessage = (req.body && req.body.message) || "";

  if (!userMessage.trim()) {
    return res.json({
      answer: "Boş mesaj gönderdin, birkaç kelime daha ekleyebilirsin 🙂",
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Türkçe konuşan, Memet Çınar'ın oyun temalı sitesine özel bir lonca asistanısın. " +
            "Kullanıcıya saygılı, nazik ve net cevaplar ver. Matematik işlemlerini hesapla, " +
            "bilgi sorularını açıkla, şarkı sözü isterse özgün sözler üret. " +
            "Bilinen şarkıların telifli resmi sözlerini asla tam olarak yazma, sadece kısa alıntı veya özet ver.",
        },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Şu an cevap üretemedim, lütfen tekrar dener misin?";

    res.status(200).json({ answer });
  } catch (err) {
    console.error("OpenAI /lonca-ai hata:", err);
    res.status(500).json({
      answer:
        "Lonca yapay zekâ sunucusuna bağlanırken bir hata oluştu. API anahtarı ve Vercel ayarlarını kontrol et.",
    });
  }
}
