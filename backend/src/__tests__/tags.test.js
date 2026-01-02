import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { sequelize, Tag, ImageTag } from "../db/models/index.js";

let userCounter = 0;

async function registerAndGetToken(app) {
  userCounter += 1;
  const reg = await request(app)
    .post("/api/auth/register")
    .send({
      username: `testuser_${userCounter}`.padEnd(6, "x"),
      email: `test_${userCounter}@example.com`,
      password: "password",
    });
  return reg.body.token;
}

async function uploadTestImage(app, token, filename = "test.png") {
  const buffer = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();

  return await request(app)
    .post("/api/images/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("files", buffer, { filename, contentType: "image/png" });
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("Tags API", () => {
  test("should add custom tag to image", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "tag_test.png");
    const imageId = upload.body.images[0].id;

    const res = await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "风景" });

    expect(res.status).toBe(200);
    expect(res.body.tag.name).toBe("风景");
    expect(res.body.tag.type).toBe("custom");
  });

  test("should get all tags for a user", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "tags_list.png");
    const imageId = upload.body.images[0].id;

    // Add multiple tags
    await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "夏天" });
    await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "海滩" });

    const res = await request(app).get("/api/tags").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tags.length).toBeGreaterThanOrEqual(2);
    const tagNames = res.body.tags.map((t) => t.name);
    expect(tagNames).toContain("夏天");
    expect(tagNames).toContain("海滩");
  });

  test("should remove tag from image", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "remove_tag.png");
    const imageId = upload.body.images[0].id;

    // Add a tag
    const addRes = await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "temporary" });
    const tagId = addRes.body.tag.id;

    // Remove the tag
    const removeRes = await request(app)
      .delete(`/api/images/${imageId}/tags/${tagId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.ok).toBe(true);

    // Verify tag is removed
    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);
    expect(detail.body.image.tags.map((t) => t.name)).not.toContain("temporary");
  });

  test("should reuse existing tag when adding same name", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload1 = await uploadTestImage(app, token, "reuse1.png");
    const imageId1 = upload1.body.images[0].id;

    const upload2 = await uploadTestImage(app, token, "reuse2.png");
    const imageId2 = upload2.body.images[0].id;

    // Add tag to first image
    const res1 = await request(app)
      .post(`/api/images/${imageId1}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "shared" });

    // Add same tag to second image
    const res2 = await request(app)
      .post(`/api/images/${imageId2}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "shared" });

    expect(res1.body.tag.id).toBe(res2.body.tag.id);

    // Verify only one tag exists in database
    const tags = await Tag.findAll({ where: { name: "shared" } });
    expect(tags.length).toBe(1);
  });

  test("should not allow adding empty tag name", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "empty_tag.png");
    const imageId = upload.body.images[0].id;

    const res = await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  test("should respect user isolation for tags", async () => {
    const app = createApp();

    // User 1 creates a tag
    const token1 = await registerAndGetToken(app);
    const upload1 = await uploadTestImage(app, token1, "user1_tag.png");
    const imageId1 = upload1.body.images[0].id;
    await request(app)
      .post(`/api/images/${imageId1}/tags`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ name: "user1_private" });

    // User 2 should not see User 1's tags
    const token2 = await registerAndGetToken(app);
    const res = await request(app).get("/api/tags").set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.tags.map((t) => t.name)).not.toContain("user1_private");
  });

  test("should delete image-tag association when image is deleted", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "cascade.png");
    const imageId = upload.body.images[0].id;

    // Add tag
    await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "test_tag" });

    // Delete image
    await request(app).delete(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);

    // Verify ImageTag associations are deleted
    const associations = await ImageTag.findAll({ where: { image_id: imageId } });
    expect(associations.length).toBe(0);
  });

  test("should handle special characters in tag names", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "special.png");
    const imageId = upload.body.images[0].id;

    const specialTags = ["风景-夏天", "东京/旅行", "photo@2024"];

    for (const tagName of specialTags) {
      const res = await request(app)
        .post(`/api/images/${imageId}/tags`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: tagName });

      expect(res.status).toBe(200);
      expect(res.body.tag.name).toBe(tagName);
    }
  });

  test("should return tags sorted by usage count", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Upload multiple images
    const uploads = [];
    for (let i = 0; i < 3; i++) {
      const upload = await uploadTestImage(app, token, `count${i}.png`);
      uploads.push(upload.body.images[0].id);
    }

    // Add "popular" tag to 3 images
    for (const imageId of uploads) {
      await request(app)
        .post(`/api/images/${imageId}/tags`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "popular" });
    }

    // Add "rare" tag to 1 image
    await request(app)
      .post(`/api/images/${uploads[0]}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "rare" });

    const res = await request(app).get("/api/tags").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // "popular" should appear before "rare" (higher usage count)
    const popularIndex = res.body.tags.findIndex((t) => t.name === "popular");
    const rareIndex = res.body.tags.findIndex((t) => t.name === "rare");
    expect(popularIndex).toBeLessThan(rareIndex);
  });
});
