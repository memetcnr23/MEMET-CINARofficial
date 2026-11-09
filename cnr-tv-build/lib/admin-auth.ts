import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "cnr_stats_session";
const MAX_AGE = 60 * 60 * 8;

function signature(payload: string) {
  const secret = process.env.CNR_STATS_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret is not configured");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken() {
  const payload = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return payload + "." + signature(payload);
}

export function verifySessionToken(token?: string) {
  if (!token) return false;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra || !/^\d{10}$/.test(payload)) return false;
  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) return false;
  try { return safeEqual(signature(payload), supplied); } catch { return false; }
}

export async function isAdminSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE;
