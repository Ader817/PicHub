import { z } from "zod";
import { CarouselItem, Image, Tag } from "../db/models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUrlForRelPath } from "../services/images.js";

const MAX_CAROUSEL_ITEMS = 20;

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

export const listCarousel = asyncHandler(async (req, res) => {
  const rows = await CarouselItem.findAll({
    where: { user_id: req.auth.userId },
    include: [
      {
        model: Image,
        required: true,
        include: [{ model: Tag, through: { attributes: [] } }],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: MAX_CAROUSEL_ITEMS,
  });

  res.json({
    images: rows.map((r) => serializeImage(r.Image)).filter(Boolean),
    limit: MAX_CAROUSEL_ITEMS,
  });
});

const addSchema = z.object({ imageId: z.coerce.number().int().positive() });

export const addToCarousel = asyncHandler(async (req, res) => {
  const { imageId } = addSchema.parse(req.body || {});

  const image = await Image.findOne({ where: { id: imageId, user_id: req.auth.userId }, attributes: ["id"] });
  if (!image) return res.status(404).json({ message: "Image not found" });

  const existing = await CarouselItem.findOne({ where: { user_id: req.auth.userId, image_id: imageId } });
  if (existing) return res.json({ ok: true, limit: MAX_CAROUSEL_ITEMS });

  const count = await CarouselItem.count({ where: { user_id: req.auth.userId } });
  if (count >= MAX_CAROUSEL_ITEMS) {
    return res.status(400).json({ message: `轮播列表最多 ${MAX_CAROUSEL_ITEMS} 张，请先移除一些图片` });
  }

  const now = new Date();
  await CarouselItem.create({
    user_id: req.auth.userId,
    image_id: imageId,
    created_at: now,
  });

  res.json({ ok: true, limit: MAX_CAROUSEL_ITEMS });
});

const removeSchema = z.object({ imageId: z.coerce.number().int().positive() });

export const removeFromCarousel = asyncHandler(async (req, res) => {
  const { imageId } = removeSchema.parse({ imageId: req.params.imageId });
  await CarouselItem.destroy({ where: { user_id: req.auth.userId, image_id: imageId } });
  res.json({ ok: true, limit: MAX_CAROUSEL_ITEMS });
});

