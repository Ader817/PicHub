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
  if (lower === "gemini-3-flash") return "gemini-3-flash-preview";
  if (lower === "gemini-3.0-pro") return "gemini-3-pro";

  return raw;
}

function getGeminiTimeoutMs() {
  const raw = Number(getEnv("GEMINI_TIMEOUT_MS", "12000"));
  if (!Number.isFinite(raw)) return 12000;
  return Math.max(1000, Math.min(raw, 60000));
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

async function generateContent({ apiKey, model, contents, apiVersionOverride, _retried = false }) {
  const apiVersion = String(apiVersionOverride || getEnv("GEMINI_API_VERSION", "v1alpha")).trim() || "v1alpha";
  const url = new URL(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`);

  const controller = new AbortController();
  const timeoutMs = getGeminiTimeoutMs();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Per docs: x-goog-api-key header is supported for authentication.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({ contents }),
      signal: controller.signal,
    });
  } catch (e) {
    const isAbort = e?.name === "AbortError" || /aborted/i.test(String(e?.message || ""));
    const err = new Error();
    if (isAbort) {
      err.message = `Gemini 调用超时（${timeoutMs}ms），请稍后重试`;
      err.statusCode = 504;
      err.code = "GEMINI_TIMEOUT";
      err.timeoutMs = timeoutMs;
    } else {
      err.message = `Gemini 请求失败（网络/TLS）。${e?.message || e}`.trim();
      err.statusCode = 502;
      err.code = "GEMINI_NETWORK";
    }
    err.expose = true;
    clearTimeout(timer);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");

    // Practical fallback: some "gemini-3-*" preview models are only available on v1alpha.
    // If user configured v1 and hits a "not found for API version v1" 404, retry once with v1alpha.
    if (!_retried && res.status === 404 && apiVersion === "v1" && String(model).startsWith("gemini-3")) {
      return generateContent({ apiKey, model, contents, apiVersionOverride: "v1alpha", _retried: true });
    }

    const err = new Error(
      `Gemini API error: ${res.status} ${msg}`.trim() + ` (apiVersion=${apiVersion}, model=${model})`
    );
    err.statusCode = 502;
    err.code = "GEMINI_API_ERROR";
    err.expose = true;
    throw err;
  }

  return res.json();
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

export async function geminiParseNlSearch({ apiKey, query, tagVocabulary }) {
  const model =
    normalizeGeminiModelName(getEnv("GEMINI_TEXT_MODEL", "gemini3flash")) || "gemini-3-flash-preview";

  const vocabList = Array.isArray(tagVocabulary)
    ? tagVocabulary
        .map((t) => String(t || "").trim())
        .filter(Boolean)
        .slice(0, 300)
    : [];

  const prompt = `
你是图片检索助手。请将以下自然语言查询转换为 JSON 格式的搜索条件，不要包含其他文字。
查询：${query}

可用字段：
- timeRange: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } （按拍摄时间）
- uploadTimeRange: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } （按上传时间）
- mustTags: string[] （必须包含的标签）
- shouldTags: string[] （相关标签，用于提升召回与排序）
- excludeTags: string[] （必须排除的标签）
- location: string
- minWidth: number
- minHeight: number
- filename: string

标签规则：
- 标签名必须从“可选标签列表”中选择；不要发明新的标签名。
- 对于“风景/人物/动物/校徽”等概念词，优先填充 shouldTags（选择多个相关标签），而不是只输出一个过于严格的标签。
- shouldTags 最多 12 个，mustTags 最多 6 个，excludeTags 最多 6 个。

可选标签列表（必须从这里选择，若没有合适的请输出空数组）：
${vocabList.length ? vocabList.map((t) => `- ${t}`).join("\n") : "- （当前用户暂无标签词表）"}

返回示例：
{"timeRange":{"start":"2025-12-01","end":"2025-12-31"},"mustTags":["地点/北京"],"shouldTags":["风景","天空","建筑"],"excludeTags":["人物"]}
`.trim();

  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  const data = await generateContent({ apiKey, model, contents });
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  const parsed = extractFirstJsonObject(text);
  if (!parsed) {
    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    const err = new Error(`Gemini NL parse failed: model did not return valid JSON. Preview: ${preview || "(empty)"}`);
    err.statusCode = 502;
    throw err;
  }

  const coerceArray = (v) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []);
  return {
    ...parsed,
    mustTags: coerceArray(parsed.mustTags),
    shouldTags: coerceArray(parsed.shouldTags),
    excludeTags: coerceArray(parsed.excludeTags),
    // Back-compat: if the model still outputs `tags`, treat it as shouldTags (soft match).
    tags: Array.isArray(parsed.tags) ? coerceArray(parsed.tags) : parsed.tags,
  };
}
