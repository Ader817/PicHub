import { DataTypes } from "sequelize";

export function defineImage(sequelize) {
  return sequelize.define(
    "Image",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      filename: { type: DataTypes.STRING(255), allowNull: false },
      original_path: { type: DataTypes.STRING(500), allowNull: false },
      thumbnail_small: { type: DataTypes.STRING(500) },
      thumbnail_medium: { type: DataTypes.STRING(500) },
      file_size: { type: DataTypes.BIGINT, allowNull: false },
      mime_type: { type: DataTypes.STRING(50), allowNull: false },
      width: { type: DataTypes.INTEGER },
      height: { type: DataTypes.INTEGER },
      is_edited: { type: DataTypes.BOOLEAN, defaultValue: false },
      parent_image_id: { type: DataTypes.BIGINT, allowNull: true },
      upload_time: { type: DataTypes.DATE, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: "image", timestamps: false }
  );
}

