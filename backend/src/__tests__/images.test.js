import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { sequelize } from "../db/models/index.js";

let userCounter = 0;

async function registerAndGetToken(app) {
  userCounter += 1;
  const reg = await request(app).post("/api/auth/register").send({
    username: `testuser_${userCounter}`.padEnd(6, "x"),
    email: `test_${userCounter}@example.com`,
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

test("edited copies get incremental names", async () => {
  const app = createApp();
  const token = await registerAndGetToken(app);

  const buffer = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .png()
    .toBuffer();

  const upload = await request(app)
    .post("/api/images/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("files", buffer, { filename: "zju.png", contentType: "image/png" });

  expect(upload.status).toBe(200);
  const parentId = upload.body.images[0].id;

  const tagRes = await request(app)
    .post(`/api/images/${parentId}/tags`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "风景" });
  expect(tagRes.status).toBe(200);

  const edit1 = await request(app)
    .post(`/api/images/${parentId}/edit`)
    .set("Authorization", `Bearer ${token}`)
    .attach("file", buffer, { filename: "edited.png", contentType: "image/png" });
  expect(edit1.status).toBe(200);
  expect(edit1.body.image.filename).toBe("zju(1).png");
  expect(edit1.body.image.tags.map((t) => t.name)).toContain("风景");

  const edit2 = await request(app)
    .post(`/api/images/${parentId}/edit`)
    .set("Authorization", `Bearer ${token}`)
    .attach("file", buffer, { filename: "edited2.png", contentType: "image/png" });
  expect(edit2.status).toBe(200);
  expect(edit2.body.image.filename).toBe("zju(2).png");
  expect(edit2.body.image.tags.map((t) => t.name)).toContain("风景");
});

test("auto creates year tag after upload", async () => {
  const app = createApp();
  const token = await registerAndGetToken(app);
  const year = new Date().getFullYear();

  const buffer = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .png()
    .toBuffer();

  const upload = await request(app)
    .post("/api/images/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("files", buffer, { filename: "year.png", contentType: "image/png" });

  expect(upload.status).toBe(200);
  const id = upload.body.images[0].id;

  const detail = await request(app).get(`/api/images/${id}`).set("Authorization", `Bearer ${token}`);
  expect(detail.status).toBe(200);
  const names = detail.body.image.tags.map((t) => t.name);
  expect(names).toContain(`时间/${year}`);
});

test("rename updates filename and keeps extension when omitted", async () => {
  const app = createApp();
  const token = await registerAndGetToken(app);

  const buffer = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();

  const upload = await request(app)
    .post("/api/images/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("files", buffer, { filename: "rename.png", contentType: "image/png" });

  expect(upload.status).toBe(200);
  const id = upload.body.images[0].id;

  const renamed = await request(app)
    .patch(`/api/images/${id}/filename`)
    .set("Authorization", `Bearer ${token}`)
    .send({ filename: "new display name" });

  expect(renamed.status).toBe(200);
  expect(renamed.body.image.filename).toBe("new display name.png");

  const detail = await request(app).get(`/api/images/${id}`).set("Authorization", `Bearer ${token}`);
  expect(detail.status).toBe(200);
  expect(detail.body.image.filename).toBe("new display name.png");
});
