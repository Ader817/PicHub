import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import { addToCarousel, listCarousel, removeFromCarousel } from "../controllers/carouselController.js";

export const carouselRouter = Router();

carouselRouter.get("/", authRequired, listCarousel);
carouselRouter.post("/", authRequired, addToCarousel);
carouselRouter.delete("/:imageId", authRequired, removeFromCarousel);

