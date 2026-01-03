import { ImageTag } from "../db/models/index.js";

export async function inheritImageTags({ fromImageId, toImageId }) {
  const now = new Date();
  const parentLinks = await ImageTag.findAll({
    where: { image_id: fromImageId },
    attributes: ["tag_id"],
    raw: true,
  });

  const uniqueTagIds = [...new Set(parentLinks.map((l) => l.tag_id).filter(Boolean))];
  if (uniqueTagIds.length === 0) return;

  await ImageTag.bulkCreate(
    uniqueTagIds.map((tagId) => ({ image_id: toImageId, tag_id: tagId, created_at: now })),
    { ignoreDuplicates: true }
  );
}
