import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import { listTags } from "../controllers/tagController.js";

export const tagsRouter = Router();

tagsRouter.get("/", authRequired, listTags);
