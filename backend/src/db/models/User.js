import { DataTypes } from "sequelize";

export function defineUser(sequelize) {
  return sequelize.define(
    "User",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: "user", timestamps: false }
  );
}

