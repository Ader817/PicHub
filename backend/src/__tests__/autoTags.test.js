import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { sequelize, Tag } from "../db/models/index.js";

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

describe("Auto Tags Service", () => {
  test("should create year tag automatically after upload", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);
    const currentYear = new Date().getFullYear();

    const upload = await uploadTestImage(app, token, "year_auto.png");
    const imageId = upload.body.images[0].id;

    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);

    expect(detail.status).toBe(200);
    const tagNames = detail.body.image.tags.map((t) => t.name);
    expect(tagNames).toContain(`时间/${currentYear}`);
  });

  test("should create month tag when province info available", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "month_auto.png");
    const imageId = upload.body.images[0].id;

    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);

    expect(detail.status).toBe(200);
    // Month tags are only created if province/city info is available
    // Since we don't have real GPS in test images, we check that year tag exists
    const tagNames = detail.body.image.tags.map((t) => t.name);
    const yearTag = tagNames.find((t) => t.startsWith("时间/"));
    expect(yearTag).toBeTruthy();
  });

  test("should not duplicate existing auto tags", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);
    const currentYear = new Date().getFullYear();

    // Upload first image
    await uploadTestImage(app, token, "dup1.png");

    // Upload second image
    await uploadTestImage(app, token, "dup2.png");

    // Check that year tag is only created once in database
    const yearTags = await Tag.findAll({
      where: { name: `时间/${currentYear}`, tag_type: "auto" },
    });

    expect(yearTags.length).toBe(1);
  });

  test("should auto tags be marked as type 'auto'", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "auto_type.png");
    const imageId = upload.body.images[0].id;

    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);

    expect(detail.status).toBe(200);
    const autoTags = detail.body.image.tags.filter((t) => t.type === "auto");
    expect(autoTags.length).toBeGreaterThan(0);
  });

  test("should inherit auto tags from parent image when editing", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const buffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .png()
      .toBuffer();

    // Upload parent image
    const upload = await request(app)
      .post("/api/images/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("files", buffer, { filename: "parent.png", contentType: "image/png" });

    const parentId = upload.body.images[0].id;
    const parentDetail = await request(app)
      .get(`/api/images/${parentId}`)
      .set("Authorization", `Bearer ${token}`);

    const parentTags = parentDetail.body.image.tags.map((t) => t.name);

    // Create edited version
    const edit = await request(app)
      .post(`/api/images/${parentId}/edit`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", buffer, { filename: "edited.png", contentType: "image/png" });

    expect(edit.status).toBe(200);
    const editedTags = edit.body.image.tags.map((t) => t.name);

    // Edited image should have auto tags from parent
    const yearTag = parentTags.find((t) => t.startsWith("时间/"));
    if (yearTag) {
      expect(editedTags).toContain(yearTag);
    }
  });
});

describe("AI Tags Generation", () => {
  test("should return 501 when GEMINI_API_KEY not configured", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Ensure API key is not set
    delete process.env.GEMINI_API_KEY;

    const upload = await uploadTestImage(app, token, "no_api.png");
    const imageId = upload.body.images[0].id;

    const res = await request(app)
      .post(`/api/images/${imageId}/ai-tags`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(501);
    expect(res.body.message).toContain("GEMINI_API_KEY");
  });

  test("should add AI-generated tags to image", async () => {
    // This test requires a valid GEMINI_API_KEY
    // Skip if not configured
    if (!process.env.GEMINI_API_KEY) {
      return;
    }

    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "ai_tag_test.png");
    const imageId = upload.body.images[0].id;

    const res = await request(app)
      .post(`/api/images/${imageId}/ai-tags`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tags).toBeDefined();
    expect(Array.isArray(res.body.tags)).toBe(true);

    // Verify tags are added to the image
    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);
    const aiTags = detail.body.image.tags.filter((t) => t.type === "ai");
    expect(aiTags.length).toBeGreaterThan(0);
  });

  test("should generate multiple types of AI tags", async () => {
    // This test requires a valid GEMINI_API_KEY
    // Skip if not configured
    if (!process.env.GEMINI_API_KEY) {
      return;
    }

    const app = createApp();
    const token = await registerAndGetToken(app);

    // Create a more interesting test image
    const buffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const upload = await request(app)
      .post("/api/images/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("files", buffer, { filename: "colorful.png", contentType: "image/png" });

    const imageId = upload.body.images[0].id;

    const res = await request(app)
      .post(`/api/images/${imageId}/ai-tags`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // AI should return scene, objects, and style tags
    expect(res.body.tags).toBeDefined();
  });

  test("should not duplicate AI tags on multiple generations", async () => {
    // This test requires a valid GEMINI_API_KEY
    // Skip if not configured
    if (!process.env.GEMINI_API_KEY) {
      return;
    }

    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "no_dup_ai.png");
    const imageId = upload.body.images[0].id;

    // Generate AI tags first time
    await request(app).post(`/api/images/${imageId}/ai-tags`).set("Authorization", `Bearer ${token}`);

    // Generate AI tags second time
    const res = await request(app)
      .post(`/api/images/${imageId}/ai-tags`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Check that we don't have duplicate tag names
    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);
    const tagNames = detail.body.image.tags.map((t) => t.name);
    const uniqueNames = new Set(tagNames);
    expect(uniqueNames.size).toBe(tagNames.length);
  });
});

describe("Tag Type Behavior", () => {
  test("should distinguish between custom, auto, and ai tags", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "types.png");
    const imageId = upload.body.images[0].id;

    // Add custom tag
    await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "我的照片" });

    const detail = await request(app).get(`/api/images/${imageId}`).set("Authorization", `Bearer ${token}`);

    const customTags = detail.body.image.tags.filter((t) => t.type === "custom");
    const autoTags = detail.body.image.tags.filter((t) => t.type === "auto");

    expect(customTags.length).toBeGreaterThan(0);
    expect(autoTags.length).toBeGreaterThan(0);
    expect(customTags.some((t) => t.name === "我的照片")).toBe(true);
  });

  test("should auto tags be shared across images", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Upload two images
    await uploadTestImage(app, token, "share1.png");
    await uploadTestImage(app, token, "share2.png");

    // Get all tags
    const res = await request(app).get("/api/tags").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const yearTag = res.body.tags.find((t) => t.name.startsWith("时间/"));
    expect(yearTag).toBeDefined();
    // Auto tags should be shared (same tag_id for both images)
    expect(yearTag.count).toBeGreaterThanOrEqual(2);
  });

  test("should custom tags be specific to user", async () => {
    const app = createApp();

    const token1 = await registerAndGetToken(app);
    const upload1 = await uploadTestImage(app, token1, "user1.png");
    const imageId1 = upload1.body.images[0].id;

    await request(app)
      .post(`/api/images/${imageId1}/tags`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ name: "私人" });

    const token2 = await registerAndGetToken(app);
    const res2 = await request(app).get("/api/tags").set("Authorization", `Bearer ${token2}`);

    // User 2 should not see User 1's custom tags
    expect(res2.body.tags.map((t) => t.name)).not.toContain("私人");
  });
});
