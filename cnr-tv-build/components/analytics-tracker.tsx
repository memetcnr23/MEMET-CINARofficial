"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SESSION_KEY = "cnr-tv-analytics-session-v1";

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname() || "/";
  useEffect(() => {
    const sessionId = getSessionId();
    const query = window.location.search;
    const path = (pathname + query).slice(0, 300);
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, sessionId }),
      keepalive: true
    }).catch(() => {
      // Analytics must never interrupt navigation or playback.
    });
  }, [pathname]);
  return null;
}
