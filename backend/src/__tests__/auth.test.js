import request from "supertest";
import { createApp } from "../app.js";
import { sequelize, User } from "../db/models/index.js";

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {});

test("register + login + me", async () => {
  const app = createApp();
  const reg = await request(app).post("/api/auth/register").send({
    username: "testuser",
    email: "test@example.com",
    password: "password",
  });
  expect(reg.status).toBe(200);
  expect(reg.body.token).toBeTruthy();

  const login = await request(app).post("/api/auth/login").send({ identifier: "testuser", password: "password" });
  expect(login.status).toBe(200);
  const token = login.body.token;

  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  expect(me.status).toBe(200);
  expect(me.body.user.username).toBe("testuser");

  const count = await User.count();
  expect(count).toBe(1);
});
