import { Router } from "express";
import multer from "multer";
import { authRequired } from "../middlewares/auth.js";
import { getDetail, list, remove, saveEdited, upload } from "../controllers/imageController.js";
import { addTagToImage, generateAiTags, removeTagFromImage } from "../controllers/tagController.js";

const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
});

export const imagesRouter = Router();

imagesRouter.post("/upload", authRequired, uploadMulter.array("files", 20), upload);
imagesRouter.get("/", authRequired, list);
imagesRouter.get("/:id", authRequired, getDetail);
imagesRouter.delete("/:id", authRequired, remove);

imagesRouter.post("/:id/edit", authRequired, uploadMulter.single("file"), saveEdited);
imagesRouter.post("/:id/ai-tags", authRequired, generateAiTags);
imagesRouter.post("/:id/tags", authRequired, addTagToImage);
imagesRouter.delete("/:id/tags/:tagId", authRequired, removeTagFromImage);
