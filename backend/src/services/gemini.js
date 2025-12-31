import fetch from "node-fetch";
import { getEnv } from "../config/env.js";

function extractFirstJsonObject(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export async function geminiVisionTags({ apiKey, mimeType, base64 }) {
  const model = getEnv("GEMINI_VISION_MODEL", "gemini-3-flash");
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  url.searchParams.set("key", apiKey);

  const prompt = `
请分析这张图片，从以下维度生成标签（每个维度1-3个标签）：
1. 场景类型（scene）
2. 主要对象（objects）
3. 色彩风格（style）
请严格按照以下JSON格式返回，不要包含其他文字：
{"scene":["标签1"],"objects":["标签1"],"style":["标签1"]}
`.trim();

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    const err = new Error(`Gemini API error: ${res.status} ${msg}`.trim());
    err.statusCode = 502;
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  const json = extractFirstJsonObject(text);
  if (!json) return { scene: [], objects: [], style: [] };

  return {
    scene: Array.isArray(json.scene) ? json.scene.map(String) : [],
    objects: Array.isArray(json.objects) ? json.objects.map(String) : [],
    style: Array.isArray(json.style) ? json.style.map(String) : [],
  };
}

export async function geminiParseNlSearch({ apiKey, query }) {
  const model = getEnv("GEMINI_TEXT_MODEL", "gemini-1.5-flash");
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
  url.searchParams.set("key", apiKey);

  const prompt = `
请将以下自然语言查询转换为JSON格式的搜索条件，不要包含其他文字。
查询：${query}

可用字段：
- timeRange: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } （按拍摄时间）
- uploadTimeRange: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } （按上传时间）
- tags: string[]
- location: string
- minWidth: number
- minHeight: number
- filename: string

返回示例：
{"timeRange":{"start":"2025-12-01","end":"2025-12-31"},"tags":["风景"],"location":"北京"}
`.trim();

  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  return extractFirstJsonObject(text);
}

