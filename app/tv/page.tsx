import type { Metadata } from "next";
import TvPlayer from "./tv-player";

export const metadata: Metadata = {
  title: "CNR Müzik TV®",
  description: "CNR Müzik TV — 7/24 müzik yayını",
};

export default function TvPage() {
  return <TvPlayer />;
}
