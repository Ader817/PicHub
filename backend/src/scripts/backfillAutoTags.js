import { sequelize, Image, ImageMetadata } from "../db/models/index.js";
import { getEnv } from "../config/env.js";
import { applyAutoTags } from "../services/autoTags.js";
import { reverseGeocodeAmap } from "../services/maps.js";

async function ensureColumns() {
  // Best-effort migrations for existing MySQL volumes.
  const dialect = getEnv("DB_DIALECT", "mysql");
  if (dialect !== "mysql") return;

  const alterations = [
    "ALTER TABLE image_metadata ADD COLUMN province VARCHAR(50) NULL",
    "ALTER TABLE image_metadata ADD COLUMN city VARCHAR(50) NULL",
    "ALTER TABLE image_metadata ADD COLUMN width INT NULL",
    "ALTER TABLE image_metadata ADD COLUMN height INT NULL",
  ];

  for (const sql of alterations) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(sql);
    } catch (e) {
      // ignore "Duplicate column" etc.
    }
  }
}

async function backfill() {
  await sequelize.authenticate();
  await ensureColumns();

  const apiKey = getEnv("AMAP_API_KEY", "");

  const images = await Image.findAll({
    include: [{ model: ImageMetadata }],
    order: [["id", "ASC"]],
  });

  let updatedMeta = 0;
  let tagged = 0;

  for (const image of images) {
    const meta = image.ImageMetadata;
    if (!meta) continue;

    // Fill width/height into metadata (helper fields) if missing.
    const needSize = (meta.width == null || meta.height == null) && (image.width != null || image.height != null);
    if (needSize) {
      meta.width = image.width;
      meta.height = image.height;
    }

    // Strictly use AMap addressComponent.city to generate location tags.
    const needGeo = !meta.city && apiKey && meta.gps_latitude != null && meta.gps_longitude != null;
    if (needGeo) {
      const loc = await reverseGeocodeAmap({
        apiKey,
        lat: Number(meta.gps_latitude),
        lon: Number(meta.gps_longitude),
      });
      if (loc) {
        meta.location_name = meta.location_name || loc.formattedAddress;
        meta.province = meta.province || loc.province;
        meta.city = meta.city || loc.city;
      }
    }

    if (meta.changed()) {
      // eslint-disable-next-line no-await-in-loop
      await meta.save();
      updatedMeta += 1;
    }

    // Apply tags (year always; location only if province+city).
    // eslint-disable-next-line no-await-in-loop
    await applyAutoTags({
      imageId: image.id,
      captureTime: meta.capture_time,
      uploadTime: image.upload_time,
      province: meta.province,
      city: meta.city,
    });
    tagged += 1;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ total: images.length, updatedMeta, tagged }, null, 2));
}

backfill()
  .then(() => process.exit(0))
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });

