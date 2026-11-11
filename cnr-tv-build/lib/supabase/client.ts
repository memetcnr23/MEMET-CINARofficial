import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase Auth yapılandırması eksik. Vercel ortam değişkenlerini kontrol edin.");
  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}
