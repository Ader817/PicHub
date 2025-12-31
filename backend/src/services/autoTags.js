import { Tag, ImageTag } from "../db/models/index.js";

function buildYearTagName(year) {
  return `时间/${year}`;
}

function buildProvinceTagName(province) {
  return `地点/${province}`;
}

function buildCityTagName(province, city) {
  return `地点/${province}/${city}`;
}

async function ensureTag({ name, now }) {
  let tag = await Tag.findOne({ where: { name } });
  if (!tag) tag = await Tag.create({ name, tag_type: "custom", created_at: now });
  return tag;
}

async function ensureImageTag({ imageId, tagId, now }) {
  const existing = await ImageTag.findOne({ where: { image_id: imageId, tag_id: tagId } });
  if (!existing) await ImageTag.create({ image_id: imageId, tag_id: tagId, created_at: now });
}

export async function applyAutoTags({ imageId, captureTime, uploadTime, province, city }) {
  const now = new Date();

  const time = captureTime || uploadTime || now;
  const year = new Date(time).getFullYear();
  const yearTag = await ensureTag({ name: buildYearTagName(year), now });
  await ensureImageTag({ imageId, tagId: yearTag.id, now });

  // Only generate location tags when AMap city is present (strictly using city field).
  if (province && city) {
    const provinceTag = await ensureTag({ name: buildProvinceTagName(province), now });
    await ensureImageTag({ imageId, tagId: provinceTag.id, now });

    const cityTag = await ensureTag({ name: buildCityTagName(province, city), now });
    await ensureImageTag({ imageId, tagId: cityTag.id, now });
  }
}

