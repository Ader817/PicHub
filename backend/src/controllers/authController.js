import { z } from "zod";
import { Op } from "sequelize";
import { User } from "../db/models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { signToken } from "../services/jwt.js";

const registerSchema = z.object({
  username: z.string().min(6).max(20),
  email: z.string().email(),
  password: z.string().min(6).max(20),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const now = new Date();

  const existing = await User.findOne({ where: { username: body.username } });
  if (existing) return res.status(409).json({ message: "Username already exists" });

  const existingEmail = await User.findOne({ where: { email: body.email } });
  if (existingEmail) return res.status(409).json({ message: "Email already exists" });

  const user = await User.create({
    username: body.username,
    email: body.email,
    password: await hashPassword(body.password),
    created_at: now,
    updated_at: now,
  });

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

export const login = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({
    where: { [Op.or]: [{ username: body.identifier }, { email: body.identifier }] },
  });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await verifyPassword(body.password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.auth.userId, { attributes: ["id", "username", "email"] });
  if (!user) return res.status(401).json({ message: "Invalid token" });
  res.json({ user });
});
