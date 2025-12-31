import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { sequelize } from "../db/models/index.js";

async function registerAndGetToken(app) {
  const reg = await request(app).post("/api/auth/register").send({
    username: "testuser2",
    email: "test2@example.com",
    password: "password",
  });
  return reg.body.token;
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  const dir = process.env.UPLOADS_DIR;
  if (dir) await fs.rm(dir, { recursive: true, force: true });
});

test("upload image creates thumbnails", async () => {
  const app = createApp();
  const token = await registerAndGetToken(app);

  const buffer = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();

  const res = await request(app)
    .post("/api/images/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("files", buffer, { filename: "test.png", contentType: "image/png" });

  expect(res.status).toBe(200);
  expect(res.body.images.length).toBe(1);
  const img = res.body.images[0];
  expect(img.thumbnailSmallUrl.startsWith("/uploads/")).toBe(true);
  expect(img.thumbnailMediumUrl.startsWith("/uploads/")).toBe(true);

  const absRoot = process.env.UPLOADS_DIR;
  const files = await fs.readdir(path.join(absRoot), { recursive: true }).catch(() => []);
  expect(files.length).toBeGreaterThan(0);
});
