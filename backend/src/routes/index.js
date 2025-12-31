import { Router } from "express";
import { authRouter } from "./auth.js";
import { imagesRouter } from "./images.js";
import { tagsRouter } from "./tags.js";
import { searchRouter } from "./search.js";

export const apiRouter = Router();

apiRouter.get("/health", (req, res) => res.json({ ok: true }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/images", imagesRouter);
apiRouter.use("/images", searchRouter);
apiRouter.use("/tags", tagsRouter);
