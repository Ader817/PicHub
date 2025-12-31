import { z } from "zod";
import { Image, ImageTag, Tag } from "../db/models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getEnv } from "../config/env.js";
import { geminiVisionTags } from "../services/gemini.js";
import { readFile, resolveInUploads } from "../services/storage.js";

const addSchema = z.object({ name: z.string().min(1).max(20) });

export const listTags = asyncHandler(async (req, res) => {
  // 只返回当前用户使用过的标签（按图片隔离）
  const tags = await Tag.findAll({
    include: [{ model: Image, where: { user_id: req.auth.userId }, through: { attributes: [] }, required: true }],
    order: [["name", "ASC"]],
  });
  const uniq = new Map();
  for (const t of tags) uniq.set(t.id, t);
  res.json({ tags: [...uniq.values()].map((t) => ({ id: t.id, name: t.name, type: t.tag_type })) });
});

export const addTagToImage = asyncHandler(async (req, res) => {
  const imageId = Number(req.params.id);
  const body = addSchema.parse(req.body);

  const image = await Image.findOne({ where: { id: imageId, user_id: req.auth.userId } });
  if (!image) return res.status(404).json({ message: "Image not found" });

  const now = new Date();
  let tag = await Tag.findOne({ where: { name: body.name } });
  if (!tag) {
    tag = await Tag.create({ name: body.name, tag_type: "custom", created_at: now });
  }

  const existing = await ImageTag.findOne({ where: { image_id: imageId, tag_id: tag.id } });
  if (!existing) await ImageTag.create({ image_id: imageId, tag_id: tag.id, created_at: now });

  res.json({ tag: { id: tag.id, name: tag.name, type: tag.tag_type } });
});

export const removeTagFromImage = asyncHandler(async (req, res) => {
  const imageId = Number(req.params.id);
  const tagId = Number(req.params.tagId);

  const image = await Image.findOne({ where: { id: imageId, user_id: req.auth.userId } });
  if (!image) return res.status(404).json({ message: "Image not found" });

  await ImageTag.destroy({ where: { image_id: imageId, tag_id: tagId } });
  res.json({ ok: true });
});

export const generateAiTags = asyncHandler(async (req, res) => {
  const imageId = Number(req.params.id);
  const apiKey = getEnv("GEMINI_API_KEY", "");
  if (!apiKey) return res.status(501).json({ message: "GEMINI_API_KEY not configured" });

  const image = await Image.findOne({ where: { id: imageId, user_id: req.auth.userId } });
  if (!image) return res.status(404).json({ message: "Image not found" });

  const abs = resolveInUploads(image.original_path);
  const buffer = await readFile(abs);
  const base64 = buffer.toString("base64");

  const tags = await geminiVisionTags({ apiKey, mimeType: image.mime_type, base64 });

  // Avoid creating tags that conflict with auto time/location namespace.
  const blockedPrefixes = ["时间/", "地点/"];
  const names = [
    ...new Set(
      [...tags.scene, ...tags.objects, ...tags.style]
        .map((s) => String(s).trim())
        .filter(Boolean)
        .filter((name) => !blockedPrefixes.some((p) => name.startsWith(p)))
    ),
  ];

  const now = new Date();
  const createdOrExisting = [];

  for (const name of names) {
    let tag = await Tag.findOne({ where: { name } });
    if (!tag) tag = await Tag.create({ name, tag_type: "ai", created_at: now });

    const link = await ImageTag.findOne({ where: { image_id: imageId, tag_id: tag.id } });
    if (!link) await ImageTag.create({ image_id: imageId, tag_id: tag.id, created_at: now });
    createdOrExisting.push(tag);
  }

  res.json({ tags: createdOrExisting.map((t) => ({ id: t.id, name: t.name, type: t.tag_type })) });
});
