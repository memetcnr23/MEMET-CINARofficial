import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CNR Müzik TV® | Türkiye'nin Müzik Televizyonu",
  description: "CNR Müzik TV — müzik klipleri, sanatçılar, programlar ve yayın akışı.",
  applicationName: "CNR Müzik TV",
  icons: { icon: "/cnr-logo.svg" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080608"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
