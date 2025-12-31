import fetch from "node-fetch";

export async function reverseGeocodeAmap({ apiKey, lat, lon }) {
  const url = new URL("https://restapi.amap.com/v3/geocode/regeo");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", `${lon},${lat}`);
  url.searchParams.set("radius", "1000");
  url.searchParams.set("extensions", "base");

  const res = await fetch(url, { timeout: 8000 });
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data?.regeocode?.formatted_address;
  return addr ? String(addr) : null;
}

