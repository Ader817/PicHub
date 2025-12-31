import { Router } from "express";
import { authRequired } from "../middlewares/auth.js";
import { nlSearch, search } from "../controllers/searchController.js";

export const searchRouter = Router();

searchRouter.post("/search", authRequired, search);
searchRouter.post("/nl-search", authRequired, nlSearch);

