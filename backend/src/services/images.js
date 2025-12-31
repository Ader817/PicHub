import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import exifParser from "exif-parser";
import { getEnv } from "../config/env.js";
import { uploadsDir } from "../config/paths.js";
import { ensureDir, relativeToUploads, resolveInUploads, removeFileIfExists, writeFile } from "./storage.js";
import { reverseGeocodeAmap } from "./maps.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function extFromMime(mime) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/webp") return ".webp";
  return "";
}

export function assertUploadFile(file) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    const err = new Error(`Unsupported file type: ${file.mimetype}`);
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
}

export function buildUploadPaths({ userId, date, basename }) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const root = uploadsDir();
  const dir = path.join(root, String(userId), year, month);
  const thumbDir = path.join(dir, "thumbnails");

  return {
    dir,
    thumbDir,
    originalAbs: path.join(dir, `${basename}`),
    smallAbs: path.join(thumbDir, `${path.parse(basename).name}_small${path.extname(basename)}`),
    mediumAbs: path.join(thumbDir, `${path.parse(basename).name}_medium${path.extname(basename)}`),
  };
}

export async function saveOriginalAndThumbnails({ userId, file, now = new Date() }) {
  assertUploadFile(file);

  const id = uuidv4();
  const ext = extFromMime(file.mimetype) || path.extname(file.originalname) || ".bin";
  const storedName = `${id}${ext}`;

  const paths = buildUploadPaths({ userId, date: now, basename: storedName });
  await ensureDir(paths.thumbDir);

  await writeFile(paths.originalAbs, file.buffer);

  const meta = await sharp(file.buffer).metadata();
  await sharp(file.buffer).resize(200, 200, { fit: "cover" }).toFile(paths.smallAbs);
  await sharp(file.buffer).resize(800, 600, { fit: "inside", withoutEnlargement: true }).toFile(paths.mediumAbs);

  const exif = extractExif(file.buffer);
  const location = await maybeReverseGeocode(exif);

  return {
    storedName,
    fileSize: file.size,
    mimeType: file.mimetype,
    width: meta.width || null,
    height: meta.height || null,
    originalRel: relativeToUploads(paths.originalAbs),
    smallRel: relativeToUploads(paths.smallAbs),
    mediumRel: relativeToUploads(paths.mediumAbs),
    exif: {
      ...exif,
      locationName: location?.formattedAddress || null,
      province: location?.province || null,
      city: location?.city || null,
    },
  };
}

export function extractExif(buffer) {
  try {
    const result = exifParser.create(buffer).parse();
    const tags = result.tags || {};

    const captureTime = tags.DateTimeOriginal
      ? new Date(tags.DateTimeOriginal * 1000)
      : tags.CreateDate
        ? new Date(tags.CreateDate * 1000)
        : null;

    const lat = typeof tags.GPSLatitude === "number" ? tags.GPSLatitude : null;
    const lon = typeof tags.GPSLongitude === "number" ? tags.GPSLongitude : null;
    const cameraModel = tags.Model ? String(tags.Model) : null;

    return { captureTime, lat, lon, cameraModel };
  } catch {
    return { captureTime: null, lat: null, lon: null, cameraModel: null };
  }
}

async function maybeReverseGeocode(exif) {
  const key = getEnv("AMAP_API_KEY", "");
  if (!key) return null;
  if (typeof exif.lat !== "number" || typeof exif.lon !== "number") return null;
  return reverseGeocodeAmap({ apiKey: key, lat: exif.lat, lon: exif.lon });
}

export function publicUrlForRelPath(rel) {
  if (!rel) return null;
  const base = getEnv("PUBLIC_BASE_URL", "");
  const pathPart = `/uploads/${rel}`.replaceAll("//", "/");
  return base ? new URL(pathPart, base).toString() : pathPart;
}

export async function deleteStoredFiles(image) {
  const rels = [image.original_path, image.thumbnail_small, image.thumbnail_medium].filter(Boolean);
  for (const rel of rels) {
    const abs = resolveInUploads(rel);
    await removeFileIfExists(abs);
  }
}
