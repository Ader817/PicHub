import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || undefined });

export function getEnv(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return value;
}

export function requireEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

