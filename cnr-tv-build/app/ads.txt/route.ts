import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  const publisherId = (process.env.ADSENSE_PUBLISHER_ID || "").replace(/^pub-/, "");
  if (!/^\d{10,25}$/.test(publisherId)) {
    return new NextResponse("# AdSense publisher ID is not configured yet.\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return new NextResponse(`google.com, pub-${publisherId}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}