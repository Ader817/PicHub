import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sequelize, Image, ImageMetadata, Tag } from "../db/models/index.js";
import { publicUrlForRelPath } from "../services/images.js";

function serialize(image) {
  return {
    id: image.id,
    filename: image.filename,
    uploadTime: image.upload_time,
    originalUrl: publicUrlForRelPath(image.original_path),
    tags: image.Tags?.map((t) => t.name) || [],
    location: image.ImageMetadata?.location_name || null,
    captureTime: image.ImageMetadata?.capture_time || null,
  };
}

const SearchRequest = z.object({
  userId: z.number().optional(),
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
});

const ImageIdRequest = z.object({ imageId: z.number() });

async function main() {
  await sequelize.authenticate();

  const server = new McpServer({ name: "pichub-mcp", version: "1.0.0" });

  server.tool("search_images", SearchRequest.shape, async (input) => {
    const userId = input.userId;
    if (!userId) return { content: [{ type: "text", text: "Missing userId (current MCP demo requires explicit userId)." }] };

    const include = [{ model: Tag, through: { attributes: [] } }, { model: ImageMetadata }];
    const where = { user_id: userId };

    const images = await Image.findAll({ where, include, order: [["upload_time", "DESC"]], limit: 50 });
    const filtered = images.filter((img) => {
      const tags = img.Tags?.map((t) => t.name) || [];
      const okTags = input.tags?.length ? input.tags.some((t) => tags.includes(t)) : true;
      const okLoc = input.location ? (img.ImageMetadata?.location_name || "").includes(input.location) : true;
      const okQuery = input.query ? img.filename.includes(input.query) || tags.some((t) => t.includes(input.query)) : true;
      return okTags && okLoc && okQuery;
    });

    return { content: [{ type: "text", text: JSON.stringify(filtered.map(serialize), null, 2) }] };
  });

  server.tool("get_image_details", ImageIdRequest.shape, async (input) => {
    const image = await Image.findOne({ where: { id: input.imageId }, include: [{ model: Tag }, { model: ImageMetadata }] });
    if (!image) return { content: [{ type: "text", text: "Image not found" }] };
    return { content: [{ type: "text", text: JSON.stringify(serialize(image), null, 2) }] };
  });

  server.tool("get_statistics", {}, async () => {
    const totalImages = await Image.count();
    const totalTags = await Tag.count();
    return { content: [{ type: "text", text: JSON.stringify({ totalImages, totalTags }) }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

