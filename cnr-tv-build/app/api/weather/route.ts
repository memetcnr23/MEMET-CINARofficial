import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat") ?? "38.3554");
  const lon = Number(searchParams.get("lon") ?? "38.3095");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) {
    return NextResponse.json({ error: "Geçersiz konum bilgisi." }, { status: 400 });
  }
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
    timezone: "auto", forecast_days: "7"
  }).toString();
  try {
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error("Meteoroloji sağlayıcısı HTTP " + response.status);
    const data = await response.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Meteoroloji servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra yeniden deneyin." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
