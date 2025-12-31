import { ImageTag } from "../db/models/index.js";

export async function inheritImageTags({ fromImageId, toImageId }) {
  const now = new Date();
  const parentLinks = await ImageTag.findAll({
    where: { image_id: fromImageId },
    attributes: ["tag_id"],
  });

  for (const link of parentLinks) {
    const tagId = link.tag_id;
    // eslint-disable-next-line no-await-in-loop
    const exists = await ImageTag.findOne({ where: { image_id: toImageId, tag_id: tagId } });
    if (exists) continue;
    // eslint-disable-next-line no-await-in-loop
    await ImageTag.create({ image_id: toImageId, tag_id: tagId, created_at: now });
  }
}

