import { sequelize } from "./models/index.js";

async function ensureTagTypeEnum() {
  const dialect = sequelize.getDialect();
  if (dialect !== "mysql") return;

  const [rows] = await sequelize.query(
    `
    SELECT COLUMN_TYPE AS columnType
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tag'
      AND COLUMN_NAME = 'tag_type'
    LIMIT 1;
  `
  );

  const columnType = rows?.[0]?.columnType ? String(rows[0].columnType) : "";
  if (!columnType) return;
  if (columnType.includes("'auto'")) return;

  await sequelize.query(`
    ALTER TABLE tag
    MODIFY tag_type ENUM('custom','ai','auto') NOT NULL;
  `);
}

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
    await ensureTagTypeEnum();
    await ensureCarouselItemTable();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Schema bootstrap skipped:", e?.message || e);
  }
}
