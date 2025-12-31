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

  const formatted = data?.regeocode?.formatted_address ? String(data.regeocode.formatted_address) : null;
  const component = data?.regeocode?.addressComponent || null;
  const province = component?.province ? String(component.province) : null;

  // AMap may return city as string or [] (for municipalities), and the user asked to strictly use the city field.
  let city = null;
  if (typeof component?.city === "string" && component.city.trim()) city = component.city.trim();
  if (Array.isArray(component?.city) && component.city.length === 0) city = null;

  return { formattedAddress: formatted, province, city };
}
