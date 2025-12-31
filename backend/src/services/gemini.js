import fetch from "node-fetch";
import { getEnv } from "../config/env.js";

function normalizeGeminiModelName(model) {
  const raw = String(model || "").trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Friendly aliases (per latest GenAI JS SDK docs/examples)
  if (lower === "gemini3flash") return "gemini-3-flash-preview";
  if (lower === "gemini3pro") return "gemini-3-pro";
  if (lower === "gemini25flash") return "gemini-2.5-flash";
  if (lower === "gemini20flash") return "gemini-2.0-flash-001";

  // Normalize some common mistaken names we saw in configs/logs
  if (lower === "gemini-3.0-flash") return "gemini-3-flash-preview";
  if (lower === "gemini-3.0-pro") return "gemini-3-pro";

  return raw;
}

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

async function generateContent({ apiKey, model, contents }) {
  const apiVersion = getEnv("GEMINI_API_VERSION", "v1alpha");
  const url = new URL(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Per docs: x-goog-api-key header is supported for authentication.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      const err = new Error(`Gemini API error: ${res.status} ${msg}`.trim());
      err.statusCode = 502;
      throw err;
    }

    return res.json();
  } catch (e) {
    const err = new Error(
      `Gemini request failed (network/TLS). If you are in a restricted network, Google API may be unreachable. Original: ${e?.message || e}`
    );
    err.statusCode = 502;
    throw err;
  }
}

export async function geminiVisionTags({ apiKey, mimeType, base64 }) {
  const model =
    normalizeGeminiModelName(getEnv("GEMINI_VISION_MODEL", "gemini3flash")) || "gemini-3-flash-preview";

  const prompt = `
请分析这张图片，从以下维度生成标签（每个维度1-3个标签）：
1. 场景类型（scene）
2. 主要对象（objects）
3. 色彩风格（style）
请严格按照以下JSON格式返回，不要包含其他文字：
{"scene":["标签1"],"objects":["标签1"],"style":["标签1"]}
`.trim();

  // REST schema uses snake_case inline_data/mime_type (per latest docs).
  const contents = [
    {
      role: "user",
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    },
  ];

  const data = await generateContent({ apiKey, model, contents });
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
  const model =
    normalizeGeminiModelName(getEnv("GEMINI_TEXT_MODEL", "gemini3flash")) || "gemini-3-flash-preview";

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

  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  const data = await generateContent({ apiKey, model, contents }).catch(() => null);
  if (!data) return null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  return extractFirstJsonObject(text);
}
