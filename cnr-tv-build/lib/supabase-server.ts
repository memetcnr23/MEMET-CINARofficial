export function getSupabaseRestConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !apiKey) return null;

  return {
    baseUrl: `${baseUrl}/rest/v1`,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`
    }
  };
}
