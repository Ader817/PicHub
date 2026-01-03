import { sequelize } from "./models/index.js";

async function ensureCarouselItemTable() {
  const dialect = sequelize.getDialect();

  if (dialect === "mysql") {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS carousel_item (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        image_id BIGINT NOT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uk_carousel_user_image (user_id, image_id),
        INDEX idx_carousel_user_id (user_id),
        INDEX idx_carousel_image_id (image_id),
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES image(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    return;
  }

  if (dialect === "sqlite") {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS carousel_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, image_id)
      );
    `);
  }
}

export async function ensureSchema() {
  try {
    await ensureCarouselItemTable();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Schema bootstrap skipped:", e?.message || e);
  }
}

