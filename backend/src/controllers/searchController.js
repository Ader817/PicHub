import { z } from "zod";
import { Op } from "sequelize";
import { Image, ImageMetadata, Tag } from "../db/models/index.js";
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

  const include = [{ model: ImageMetadata, where: Object.keys(metaWhere).length ? metaWhere : undefined, required: Object.keys(metaWhere).length > 0 }];

  if (criteria.tags?.length) {
    include.push({
      model: Tag,
      where: { name: { [Op.in]: criteria.tags } },
      required: true,
      through: { attributes: [] },
    });
  } else {
    include.push({ model: Tag, through: { attributes: [] } });
  }

  const images = await Image.findAll({ where, include, order: [["upload_time", "DESC"]], distinct: true });

  // Filter in JavaScript for AND logic on tags
  if (criteria.tags?.length > 1) {
    return images.filter((img) => {
      const tagNames = img.Tags?.map((t) => t.name) || [];
      return criteria.tags.every((tag) => tagNames.includes(tag));
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

export const nlSearch = asyncHandler(async (req, res) => {
  const { query } = nlSchema.parse(req.body);
  const apiKey = getEnv("GEMINI_API_KEY", "");
  if (!apiKey) return res.status(501).json({ message: "GEMINI_API_KEY not configured" });

  let parsed = null;
  try {
    parsed = await geminiParseNlSearch({ apiKey, query });
  } catch (e) {
    return res.json({
      query,
      criteria: null,
      images: [],
      error: e?.message || String(e),
    });
  }

  const criteria = searchSchema.parse(parsed || {});
  const images = await runSearch({ userId: req.auth.userId, criteria });
  res.json({ query, criteria, images: images.map(serializeImage), error: null });
});
