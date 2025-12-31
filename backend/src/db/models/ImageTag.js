import { DataTypes } from "sequelize";

export function defineImageTag(sequelize) {
  return sequelize.define(
    "ImageTag",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      image_id: { type: DataTypes.BIGINT, allowNull: false },
      tag_id: { type: DataTypes.BIGINT, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: "image_tag", timestamps: false }
  );
}

