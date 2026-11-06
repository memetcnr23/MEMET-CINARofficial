export function getSupabaseRestConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;

  return {
    baseUrl: `${baseUrl}/rest/v1`,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  };
}
