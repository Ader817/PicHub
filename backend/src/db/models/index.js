import { createSequelize } from "../sequelize.js";
import { defineUser } from "./User.js";
import { defineImage } from "./Image.js";
import { defineImageMetadata } from "./ImageMetadata.js";
import { defineTag } from "./Tag.js";
import { defineImageTag } from "./ImageTag.js";

export const sequelize = createSequelize();

export const User = defineUser(sequelize);
export const Image = defineImage(sequelize);
export const ImageMetadata = defineImageMetadata(sequelize);
export const Tag = defineTag(sequelize);
export const ImageTag = defineImageTag(sequelize);

User.hasMany(Image, { foreignKey: "user_id" });
Image.belongsTo(User, { foreignKey: "user_id" });

Image.hasOne(ImageMetadata, { foreignKey: "image_id" });
ImageMetadata.belongsTo(Image, { foreignKey: "image_id" });

Image.belongsToMany(Tag, { through: ImageTag, foreignKey: "image_id", otherKey: "tag_id" });
Tag.belongsToMany(Image, { through: ImageTag, foreignKey: "tag_id", otherKey: "image_id" });

