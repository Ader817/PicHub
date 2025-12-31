import { z } from "zod";
import { Image, ImageMetadata, Tag } from "../db/models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteStoredFiles, publicUrlForRelPath, saveOriginalAndThumbnails } from "../services/images.js";

function normalizeUploadFilename(originalname) {
  if (!originalname) return "unnamed";

  // multer/busboy historically decodes multipart headers as latin1, which can
  // produce mojibake for UTF-8 filenames (e.g. "浙江大学.png" -> "æµæ±å¤§å­¦.png").
  // Try a latin1 -> utf8 reinterpretation only when it looks like mojibake and
  // the result contains CJK characters.
  const looksLikeMojibake = /[ÃÂâ€™â€œâ€\u00A0-\u00FF]/.test(originalname);
  if (!looksLikeMojibake) return originalname;

  const decoded = Buffer.from(originalname, "latin1").toString("utf8");
  const hasCjk = /[\u4E00-\u9FFF]/.test(decoded);
  if (hasCjk) return decoded;

  return originalname;
}

function serializeImage(image) {
  return {
    id: image.id,
    filename: image.filename,
    width: image.width,
    height: image.height,
    isEdited: Boolean(image.is_edited),
    parentImageId: image.parent_image_id,
    uploadTime: image.upload_time,
    originalUrl: publicUrlForRelPath(image.original_path),
    thumbnailSmallUrl: publicUrlForRelPath(image.thumbnail_small),
    thumbnailMediumUrl: publicUrlForRelPath(image.thumbnail_medium),
    tags: image.Tags?.map((t) => ({ id: t.id, name: t.name, type: t.tag_type })) || [],
    metadata: image.ImageMetadata
      ? {
          captureTime: image.ImageMetadata.capture_time,
          lat: image.ImageMetadata.gps_latitude,
          lon: image.ImageMetadata.gps_longitude,
          locationName: image.ImageMetadata.location_name,
          cameraModel: image.ImageMetadata.camera_model,
          aperture: image.ImageMetadata.aperture,
          shutterSpeed: image.ImageMetadata.shutter_speed,
          iso: image.ImageMetadata.iso,
        }
      : null,
  };
}

export const upload = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ message: "No files" });

  const created = [];
  for (const file of files) {
    const saved = await saveOriginalAndThumbnails({ userId: req.auth.userId, file, now: new Date() });
    const now = new Date();

    const image = await Image.create({
      user_id: req.auth.userId,
      filename: normalizeUploadFilename(file.originalname),
      original_path: saved.originalRel,
      thumbnail_small: saved.smallRel,
      thumbnail_medium: saved.mediumRel,
      file_size: saved.fileSize,
      mime_type: saved.mimeType,
      width: saved.width,
      height: saved.height,
      is_edited: false,
      parent_image_id: null,
      upload_time: now,
      created_at: now,
    });

    await ImageMetadata.create({
      image_id: image.id,
      capture_time: saved.exif.captureTime,
      gps_latitude: saved.exif.lat,
      gps_longitude: saved.exif.lon,
      location_name: saved.exif.locationName,
      camera_model: saved.exif.cameraModel,
    });

    created.push(image);
  }

  const images = await Image.findAll({
    where: { id: created.map((i) => i.id), user_id: req.auth.userId },
    include: [{ model: Tag }, { model: ImageMetadata }],
    order: [["upload_time", "DESC"]],
  });

  res.json({ images: images.map(serializeImage) });
});

export const list = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 50);
  const offset = Number(req.query.offset || 0);

  const images = await Image.findAll({
    where: { user_id: req.auth.userId },
    include: [{ model: Tag }, { model: ImageMetadata }],
    order: [["upload_time", "DESC"]],
    limit,
    offset,
  });

  res.json({ images: images.map(serializeImage) });
});

export const getDetail = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const image = await Image.findOne({
    where: { id, user_id: req.auth.userId },
    include: [{ model: Tag }, { model: ImageMetadata }],
  });
  if (!image) return res.status(404).json({ message: "Image not found" });
  res.json({ image: serializeImage(image) });
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const image = await Image.findOne({ where: { id, user_id: req.auth.userId } });
  if (!image) return res.status(404).json({ message: "Image not found" });

  await deleteStoredFiles(image);
  await ImageMetadata.destroy({ where: { image_id: id } });
  await image.destroy();

  res.json({ ok: true });
});

const editSchema = z.object({}).passthrough();

export const saveEdited = asyncHandler(async (req, res) => {
  void editSchema.parse(req.body || {});
  const parentId = Number(req.params.id);

  const parent = await Image.findOne({ where: { id: parentId, user_id: req.auth.userId } });
  if (!parent) return res.status(404).json({ message: "Image not found" });

  const file = req.file;
  if (!file) return res.status(400).json({ message: "Missing file" });

  const saved = await saveOriginalAndThumbnails({ userId: req.auth.userId, file, now: new Date() });
  const now = new Date();

  const image = await Image.create({
    user_id: req.auth.userId,
    filename: `${parent.filename}_edited`,
    original_path: saved.originalRel,
    thumbnail_small: saved.smallRel,
    thumbnail_medium: saved.mediumRel,
    file_size: saved.fileSize,
    mime_type: saved.mimeType,
    width: saved.width,
    height: saved.height,
    is_edited: true,
    parent_image_id: parentId,
    upload_time: now,
    created_at: now,
  });

  await ImageMetadata.create({
    image_id: image.id,
    capture_time: saved.exif.captureTime,
    gps_latitude: saved.exif.lat,
    gps_longitude: saved.exif.lon,
    location_name: saved.exif.locationName,
    camera_model: saved.exif.cameraModel,
  });

  const full = await Image.findOne({ where: { id: image.id }, include: [{ model: Tag }, { model: ImageMetadata }] });
  res.json({ image: serializeImage(full) });
});
