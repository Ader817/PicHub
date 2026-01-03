import { createApp } from "./app.js";
import { sequelize } from "./db/models/index.js";
import { getEnv } from "./config/env.js";
import { ensureSchema } from "./db/ensureSchema.js";

const app = createApp();

async function main() {
  await sequelize.authenticate();
  await ensureSchema();
  const port = Number(getEnv("PORT", "8080"));
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`PicHub backend listening on :${port}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
