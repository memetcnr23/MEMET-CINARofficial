import type { Metadata, Viewport } from "next";
import AnalyticsTracker from "@/components/analytics-tracker";
import "./globals.css";
export const metadata: Metadata = { title: "CNR Müzik TV® | Ritmin Adresi", description: "CNR Müzik TV — canlı yayın, programlar, müzik listeleri ve klip arşivi.", applicationName: "CNR Müzik TV®", icons: { icon: "/cnr-logo.svg" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#08090c" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="tr"><body><AnalyticsTracker />{children}</body></html>; }
