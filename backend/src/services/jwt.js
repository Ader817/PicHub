import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export function signToken(payload) {
  return jwt.sign(payload, getEnv("JWT_SECRET", "please_change_me"), {
    expiresIn: getEnv("JWT_EXPIRES_IN", "7d"),
  });
}

