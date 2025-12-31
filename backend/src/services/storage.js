import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "../config/paths.js";

export function relativeToUploads(absPath) {
  const root = uploadsDir();
  const rel = path.relative(root, absPath);
  return rel.replaceAll(path.sep, "/");
}

export function resolveInUploads(relPath) {
  const root = uploadsDir();
  return path.resolve(root, relPath);
}

export async function ensureDir(absDir) {
  await fs.mkdir(absDir, { recursive: true });
}

export async function writeFile(absPath, buffer) {
  await ensureDir(path.dirname(absPath));
  await fs.writeFile(absPath, buffer);
}

export async function removeFileIfExists(absPath) {
  try {
    await fs.unlink(absPath);
  } catch (e) {
    if (e && e.code === "ENOENT") return;
    throw e;
  }
}

export async function readFile(absPath) {
  return fs.readFile(absPath);
}
