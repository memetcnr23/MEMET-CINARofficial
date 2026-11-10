import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 600;

type Geo = { name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string };

const DEFAULT_CITY: Geo = { name: "Malatya", latitude: 38.3552, longitude: 38.3095, country: "Türkiye", admin1: "Malatya", timezone: "Europe/Istanbul" };

async function geocode(city: string): Promise<Geo> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "tr");
  url.searchParams.set("format", "json");
  const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error("Şehir arama servisi şu anda yanıt vermiyor.");
  const json = await response.json();
  const results = (json.results || []) as Array<Record<string, unknown>>;
  if (!results.length) throw new Error("Bu şehir bulunamadı. Şehir adını kontrol edip tekrar deneyin.");
  const item = results[0];
  return {
    name: String(item.name || city),
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    country: item.country ? String(item.country) : undefined,
    admin1: item.admin1 ? String(item.admin1) : undefined,
    timezone: item.timezone ? String(item.timezone) : "auto"
  };
}

async function forecast(place: Geo) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure");
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max");
  url.searchParams.set("timezone", place.timezone || "auto");
  url.searchParams.set("forecast_days", "7");
  const response = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error("Meteoroloji veri sağlayıcısı geçici olarak yanıt vermiyor.");
  const data = await response.json();
  if (!data.current || !data.daily || !data.hourly) throw new Error("Meteoroloji servisi eksik veri döndürdü.");
  return {
    location: { ...place, timezone: data.timezone || place.timezone || "auto" },
    current: data.current,
    hourly: data.hourly,
    daily: data.daily,
    units: { current: data.current_units, hourly: data.hourly_units, daily: data.daily_units },
    source: "Open-Meteo",
    updatedAt: new Date().toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    let place: Geo;
    if (params.has("lat") && params.has("lon") && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      place = { name: params.get("name") || "Seçilen konum", latitude: lat, longitude: lon, timezone: "auto" };
    } else {
      const city = (params.get("city") || "Malatya").trim().slice(0, 80);
      place = city.toLocaleLowerCase("tr") === "malatya" ? DEFAULT_CITY : await geocode(city);
    }
    const result = await forecast(place);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=900" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hava durumu verisi alınamadı.";
    return NextResponse.json({ error: message, source: "Open-Meteo", updatedAt: null }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
