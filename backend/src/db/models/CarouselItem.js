import { DataTypes } from "sequelize";

export function defineCarouselItem(sequelize) {
  return sequelize.define(
    "CarouselItem",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT, allowNull: false },
      image_id: { type: DataTypes.BIGINT, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: "carousel_item", timestamps: false }
  );
}
