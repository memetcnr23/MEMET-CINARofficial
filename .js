import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST" });
  }

  const userMessage = (req.body && req.body.message) || "";

  if (!userMessage.trim()) {
    return res.status(200).json({
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
            "Kullanıcıya saygılı, nazik ve net cevaplar ver.",
        },
        { role: "user", content: userMessage },
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Şu an cevap üretemedim, lütfen tekrar dener misin?";

    res.status(200).json({ answer });
  } catch (err) {
    console.error("Vercel /api/lonca-ai hata:", err);
    res.status(500).json({
      answer:
        "Sunucu tarafında lonca yapay zekâ ile konuşurken bir hata oluştu. Biraz sonra tekrar dene.",
    });
  }
}
