import { DataTypes } from "sequelize";

export function defineTag(sequelize) {
  return sequelize.define(
    "Tag",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      tag_type: { type: DataTypes.ENUM("custom", "ai"), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: "tag", timestamps: false }
  );
}

