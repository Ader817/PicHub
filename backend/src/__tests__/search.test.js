import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { sequelize, Image, Tag, ImageMetadata } from "../db/models/index.js";

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

describe("Search API", () => {
  test("should return empty results when no images match", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const res = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({ tags: ["nonexistent"] });

    expect(res.status).toBe(200);
    expect(res.body.images).toEqual([]);
  });

  test("should search images by tag", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Upload an image
    const upload = await uploadTestImage(app, token, "search_test.png");
    const imageId = upload.body.images[0].id;

    // Add a custom tag
    await request(app)
      .post(`/api/images/${imageId}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "风景" });

    // Search by tag
    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({ tags: ["风景"] });

    expect(search.status).toBe(200);
    expect(search.body.images.length).toBe(1);
    expect(search.body.images[0].id).toBe(imageId);
  });

  test("should search images by filename", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    await uploadTestImage(app, token, "unique_name.png");

    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({ filename: "unique_name" });

    expect(search.status).toBe(200);
    expect(search.body.images.length).toBe(1);
    expect(search.body.images[0].filename).toBe("unique_name.png");
  });

  test("should search images by multiple tags (AND logic)", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Upload first image and add tags
    const upload1 = await uploadTestImage(app, token, "multi1.png");
    const imageId1 = upload1.body.images[0].id;
    await request(app)
      .post(`/api/images/${imageId1}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "风景" });
    await request(app)
      .post(`/api/images/${imageId1}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "夏天" });

    // Upload second image with only one tag
    const upload2 = await uploadTestImage(app, token, "multi2.png");
    const imageId2 = upload2.body.images[0].id;
    await request(app)
      .post(`/api/images/${imageId2}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "风景" });

    // Search with both tags - should only return first image
    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({ tags: ["风景", "夏天"] });

    expect(search.status).toBe(200);
    expect(search.body.images.length).toBe(1);
    expect(search.body.images[0].id).toBe(imageId1);
  });

  test("should filter images by minimum dimensions", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Upload 800x600 image
    await uploadTestImage(app, token, "large.png");

    // Upload smaller image
    const buffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .png()
      .toBuffer();

    await request(app)
      .post("/api/images/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("files", buffer, { filename: "small.png", contentType: "image/png" });

    // Search for images with minimum width 500
    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({ minWidth: 500 });

    expect(search.status).toBe(200);
    expect(search.body.images.length).toBe(1);
    expect(search.body.images[0].filename).toBe("large.png");
  });

  test("should filter images by time range", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    const upload = await uploadTestImage(app, token, "timerange.png");
    const imageId = upload.body.images[0].id;

    // Update the image with a specific capture time
    await ImageMetadata.update(
      { capture_time: new Date("2024-06-15T10:00:00Z") },
      { where: { image_id: imageId } }
    );

    // Search within time range
    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({
        timeRange: {
          start: "2024-01-01",
          end: "2024-12-31",
        },
      });

    expect(search.status).toBe(200);
    expect(search.body.images.length).toBe(1);
  });

  test("should respect user isolation in search", async () => {
    const app = createApp();

    // User 1 uploads and tags an image
    const token1 = await registerAndGetToken(app);
    const upload1 = await uploadTestImage(app, token1, "user1.png");
    const imageId1 = upload1.body.images[0].id;
    await request(app)
      .post(`/api/images/${imageId1}/tags`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ name: "private" });

    // User 2 searches for the tag
    const token2 = await registerAndGetToken(app);
    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token2}`)
      .send({ tags: ["private"] });

    // User 2 should not see User 1's images
    expect(search.status).toBe(200);
    expect(search.body.images).toEqual([]);
  });

  test("should return images with pagination", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Upload 3 images
    await uploadTestImage(app, token, "page1.png");
    await uploadTestImage(app, token, "page2.png");
    await uploadTestImage(app, token, "page3.png");

    // Search with limit
    const search = await request(app)
      .post("/api/images/search")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(search.status).toBe(200);
    expect(search.body.images.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Natural Language Search", () => {
  test("should return 501 when GEMINI_API_KEY not configured", async () => {
    const app = createApp();
    const token = await registerAndGetToken(app);

    // Ensure API key is not set
    delete process.env.GEMINI_API_KEY;

    const res = await request(app)
      .post("/api/images/nl-search")
      .set("Authorization", `Bearer ${token}`)
      .send({ query: "show me landscape photos" });

    expect(res.status).toBe(501);
    expect(res.body.message).toContain("GEMINI_API_KEY");
  });
});
