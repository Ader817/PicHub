import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing Authorization Bearer token" });

  try {
    const payload = jwt.verify(token, getEnv("JWT_SECRET", "please_change_me"));
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

