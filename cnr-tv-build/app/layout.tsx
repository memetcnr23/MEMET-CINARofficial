import type { Metadata, Viewport } from "next";
import Script from "next/script";
import AnalyticsTracker from "@/components/analytics-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "CNR Müzik TV® | Türkiye'nin Müzik Televizyonu",
  description: "CNR Müzik TV — canlı müzik yayını, yayın akışı, programlar, sanatçılar ve klip arşivi.",
  applicationName: "CNR Müzik TV",
  icons: { icon: "/cnr-logo.webp" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080608"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
  const validAdsenseClient = /^ca-pub-[0-9]+$/.test(adsenseClient);
  return <html lang="tr"><head>
    <meta name="google-adsense-account" content="ca-pub-6127233618306992" />
    {validAdsenseClient && <Script
      id="google-adsense"
      async
      strategy="beforeInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
    />}
  </head><body>
    <AnalyticsTracker />
    {children}
  </body></html>;
}
