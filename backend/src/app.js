import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { uploadsDir } from "./config/paths.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/error.js";
import { handleValidationErrors } from "./middlewares/validation.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "2mb" }));

  const uploads = uploadsDir();
  app.use("/uploads", express.static(uploads));

  const openapi = YAML.load(path.resolve(process.cwd(), "src/openapi.yaml"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(handleValidationErrors);
  app.use(errorHandler);

  return app;
}

