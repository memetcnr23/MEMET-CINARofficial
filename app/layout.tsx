import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description:
    "CNR Müzik TV® — 7/24 kesintisiz müzik yayını, klipler, şarkı sözleri ve visualizer videoları.",
  title: {
    default: "CNR Müzik TV®",
    template: "%s · CNR Müzik TV",
  },
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="tr" className={`${geist.variable} ${geistMono.variable}`}>
    <body>
      <a
        href="#main"
        className="focus:bg-background sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:rounded-md focus:p-3"
      >
        Skip to content
      </a>
      {children}
    </body>
  </html>
);

export default RootLayout;
