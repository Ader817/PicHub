import { DataTypes } from "sequelize";

export function defineImageMetadata(sequelize) {
  return sequelize.define(
    "ImageMetadata",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      image_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
      capture_time: { type: DataTypes.DATE },
      gps_latitude: { type: DataTypes.DECIMAL(10, 8) },
      gps_longitude: { type: DataTypes.DECIMAL(11, 8) },
      location_name: { type: DataTypes.STRING(255) },
      camera_model: { type: DataTypes.STRING(100) },
      aperture: { type: DataTypes.STRING(20) },
      shutter_speed: { type: DataTypes.STRING(20) },
      iso: { type: DataTypes.INTEGER },
    },
    { tableName: "image_metadata", timestamps: false }
  );
}

