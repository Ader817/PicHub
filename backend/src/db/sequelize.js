import { Sequelize } from "sequelize";
import { getEnv } from "../config/env.js";

export function createSequelize() {
  const dialect = getEnv("DB_DIALECT", "mysql");

  if (dialect === "sqlite") {
    return new Sequelize({
      dialect: "sqlite",
      storage: getEnv("DB_SQLITE_STORAGE", ":memory:"),
      logging: false,
    });
  }

  return new Sequelize(getEnv("DB_NAME", "pichub"), getEnv("DB_USER", "pichub_user"), getEnv("DB_PASSWORD", "pichub_pass"), {
    host: getEnv("DB_HOST", "localhost"),
    port: Number(getEnv("DB_PORT", "3306")),
    dialect: "mysql",
    logging: false,
    timezone: "+08:00",
  });
}

