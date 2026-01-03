import { z } from "zod";
import { Op } from "sequelize";
import { Image, ImageMetadata, Tag, sequelize } from "../db/models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getEnv } from "../config/env.js";
import { geminiParseNlSearch } from "../services/gemini.js";
import { publicUrlForRelPath } from "../services/images.js";

const searchSchema = z
  .object({
    timeRange: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
    uploadTimeRange: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
    tags: z.array(z.string()).optional(),
    location: z.string().optional(),
    minWidth: z.coerce.number().optional(),
    minHeight: z.coerce.number().optional(),
    filename: z.string().optional(),
  })
  .passthrough();

function serializeImage(image) {
  return {
    id: image.id,
    filename: image.filename,
    width: image.width,
    height: image.height,
    uploadTime: image.upload_time,
    originalUrl: publicUrlForRelPath(image.original_path),
    thumbnailSmallUrl: publicUrlForRelPath(image.thumbnail_small),
    thumbnailMediumUrl: publicUrlForRelPath(image.thumbnail_medium),
    tags: image.Tags?.map((t) => ({ id: t.id, name: t.name, type: t.tag_type })) || [],
  };
}

function buildRangeWhere({ start, end }) {
  const where = {};
  if (start) where[Op.gte] = new Date(start);
  if (end) where[Op.lte] = new Date(end);
  return Object.keys(where).length ? where : null;
}

function tagPathMatches(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(`${b}/`)) return true;
  if (b.startsWith(`${a}/`)) return true;
  return false;
}

function imageMatchesTag(image, tag) {
  const names = image?.Tags?.map((t) => t.name) || [];
  return names.some((n) => tagPathMatches(n, tag));
}

function imageMatchCount(image, tags) {
  if (!Array.isArray(tags) || tags.length === 0) return 0;
  return tags.reduce((acc, t) => acc + (imageMatchesTag(image, t) ? 1 : 0), 0);
}

function applyTagFilterAndScoreScored({ images, mustTags, shouldTags, excludeTags, shouldMinMatch }) {
  const must = Array.isArray(mustTags) ? mustTags.filter(Boolean) : [];
  const should = Array.isArray(shouldTags) ? shouldTags.filter(Boolean) : [];
  const exclude = Array.isArray(excludeTags) ? excludeTags.filter(Boolean) : [];
  const minShould = Number.isFinite(shouldMinMatch) ? Math.max(0, shouldMinMatch) : 0;

  const filtered = [];
  for (const img of images) {
    if (exclude.length && exclude.some((t) => imageMatchesTag(img, t))) continue;
    if (must.length && !must.every((t) => imageMatchesTag(img, t))) continue;

    const score = imageMatchCount(img, should);
    if (minShould > 0 && score < minShould) continue;

    filtered.push({ img, score });
  }

  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.img.upload_time).getTime() - new Date(a.img.upload_time).getTime();
  });

  return filtered;
}

function applyTagFilterAndScore({ images, mustTags, shouldTags, excludeTags, shouldMinMatch }) {
  return applyTagFilterAndScoreScored({ images, mustTags, shouldTags, excludeTags, shouldMinMatch }).map((x) => x.img);
}

function expandToVocabulary({ rawTags, vocabulary, maxOut = 18 }) {
  const vocab = Array.isArray(vocabulary) ? vocabulary : [];
  const seeds = Array.isArray(rawTags) ? rawTags.map(String).map((s) => s.trim()).filter(Boolean) : [];
  if (!seeds.length || !vocab.length) return [];

  const out = new Set();

  for (const t of seeds) {
    if (vocab.includes(t)) out.add(t);
  }

  for (const t of seeds) {
    if (out.size >= maxOut) break;
    if (vocab.includes(t)) continue;
    const hits = vocab.filter((v) => v.includes(t) || t.includes(v)).slice(0, 3);
    for (const h of hits) {
      out.add(h);
      if (out.size >= maxOut) break;
    }
  }

  return Array.from(out).slice(0, maxOut);
}

async function runSearch({ userId, criteria }) {
  const where = { user_id: userId };
  const metaWhere = {};

  const uploadRange = criteria.uploadTimeRange ? buildRangeWhere(criteria.uploadTimeRange) : null;
  if (uploadRange) where.upload_time = uploadRange;

  const captureRange = criteria.timeRange ? buildRangeWhere(criteria.timeRange) : null;
  if (captureRange) metaWhere.capture_time = captureRange;

  if (criteria.location) metaWhere.location_name = { [Op.like]: `%${criteria.location}%` };

  if (criteria.minWidth) where.width = { ...(where.width || {}), [Op.gte]: criteria.minWidth };
  if (criteria.minHeight) where.height = { ...(where.height || {}), [Op.gte]: criteria.minHeight };
  if (criteria.filename) where.filename = { [Op.like]: `%${criteria.filename}%` };

  const include = [
    {
      model: ImageMetadata,
      where: Object.keys(metaWhere).length ? metaWhere : undefined,
      required: Object.keys(metaWhere).length > 0,
    },
    { model: Tag, through: { attributes: [] } },
  ];

  const images = await Image.findAll({ where, include, order: [["upload_time", "DESC"]], distinct: true });

  // Condition search: treat multiple tags as AND (more precise, matches UI expectations/tests).
  if (Array.isArray(criteria.tags) && criteria.tags.length) {
    return applyTagFilterAndScore({
      images,
      mustTags: criteria.tags,
      shouldTags: [],
      excludeTags: [],
      shouldMinMatch: 0,
    });
  }

  return images;
}

export const search = asyncHandler(async (req, res) => {
  const criteria = searchSchema.parse(req.body || {});
  const images = await runSearch({ userId: req.auth.userId, criteria });
  res.json({ criteria, images: images.map(serializeImage) });
});

const nlSchema = z.object({ query: z.string().min(1) });

async function getUserTagVocabulary({ userId, limit = 500 }) {
  const rows = await Tag.findAll({
    attributes: ["name"],
    include: [
      {
        model: Image,
        attributes: [],
        where: { user_id: userId },
        required: true,
        through: { attributes: [] },
      },
    ],
    group: ["Tag.name"],
    order: [[sequelize.col("Tag.name"), "ASC"]],
    limit,
    raw: true,
  });
  return rows.map((r) => r.name).filter(Boolean);
}

export const nlSearch = asyncHandler(async (req, res) => {
  const { query } = nlSchema.parse(req.body);
  const apiKey = getEnv("GEMINI_API_KEY", "");
  if (!apiKey) return res.status(501).json({ message: "GEMINI_API_KEY not configured" });

  let parsed = null;
  const tagVocabulary = await getUserTagVocabulary({ userId: req.auth.userId });
  try {
    parsed = await geminiParseNlSearch({ apiKey, query, tagVocabulary });
  } catch (e) {
    return res.json({
      query,
      criteria: null,
      images: [],
      error: e?.message || String(e),
    });
  }

  const criteria = searchSchema.parse(parsed || {});
  const baseImages = await runSearch({ userId: req.auth.userId, criteria: { ...criteria, tags: undefined } });

  const rawMustTags = Array.isArray(criteria.mustTags) ? criteria.mustTags : [];
  const rawShouldTags = Array.isArray(criteria.shouldTags)
    ? criteria.shouldTags
    : Array.isArray(criteria.tags)
      ? criteria.tags
      : [];
  const rawExcludeTags = Array.isArray(criteria.excludeTags) ? criteria.excludeTags : [];

  const resolvedMust = rawMustTags.filter((t) => tagVocabulary.includes(t)).slice(0, 6);
  const unresolvedMust = rawMustTags.filter((t) => !tagVocabulary.includes(t));

  const resolvedShould = expandToVocabulary({
    rawTags: [...rawShouldTags, ...unresolvedMust],
    vocabulary: tagVocabulary,
    maxOut: 18,
  });

  const resolvedExclude = rawExcludeTags.filter((t) => tagVocabulary.includes(t)).slice(0, 6);

  const shouldMinMatch = resolvedMust.length === 0 && resolvedShould.length > 0 ? 1 : 0;

  const hasNonTagCriteria =
    Boolean(criteria.location) ||
    Boolean(criteria.filename) ||
    Boolean(criteria.minWidth) ||
    Boolean(criteria.minHeight) ||
    Boolean(criteria.timeRange?.start || criteria.timeRange?.end) ||
    Boolean(criteria.uploadTimeRange?.start || criteria.uploadTimeRange?.end);

  const hasTagCriteria = resolvedMust.length > 0 || resolvedShould.length > 0 || resolvedExclude.length > 0;

  if (!hasNonTagCriteria && !hasTagCriteria) {
    return res.json({
      query,
      criteria: {
        ...criteria,
        mustTags: [],
        shouldTags: [],
        excludeTags: [],
        shouldMinMatch: 0,
        tagStrategy: "soft",
        nlRaw: {
          mustTags: rawMustTags,
          shouldTags: rawShouldTags,
          excludeTags: rawExcludeTags,
        },
      },
      images: baseImages.map(serializeImage),
      error: "自然语言解析未产生可用筛选条件，已返回全部图片（可尝试条件搜索或先生成 AI 标签）",
      errorLevel: "warning",
    });
  }

  const scored = applyTagFilterAndScoreScored({
    images: baseImages,
    mustTags: resolvedMust,
    shouldTags: resolvedShould,
    excludeTags: resolvedExclude,
    shouldMinMatch,
  });

  res.json({
    query,
    criteria: {
      ...criteria,
      mustTags: resolvedMust,
      shouldTags: resolvedShould,
      excludeTags: resolvedExclude,
      shouldMinMatch,
      tagStrategy: "soft",
      nlRaw: {
        mustTags: rawMustTags,
        shouldTags: rawShouldTags,
        excludeTags: rawExcludeTags,
      },
    },
    images: scored.map(({ img, score }) => ({
      ...serializeImage(img),
      matchScore: resolvedShould.length ? score : undefined,
    })),
    error: null,
    errorLevel: null,
  });
});
