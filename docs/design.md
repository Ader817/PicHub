# PicHub 图片管理网站 - 项目设计文档（以代码为准）

> 更新时间：2026-01-03  
> 说明：本设计文档以当前仓库实现为准，并对早期“React/Spring/MCP”等规划内容做了收敛与修订。

## 1. 概述

### 1.1 项目简介
PicHub 是一个基于 B/S 架构的图片管理网站，提供上传、缩略图生成、EXIF 信息提取、标签管理、条件搜索/自然语言搜索、轮播展示以及基础图片编辑等能力。

### 1.2 设计目标
- 模块清晰：前后端分离、后端分层（Route/Controller/Service）
- 数据可追溯：图片元信息与标签可查询、可演示
- 易部署：Docker Compose 一键启动
- 体验友好：PC/移动端可用、空态与错误提示明确

---

## 2. 技术栈与关键依赖

### 2.1 前端
- Vue 3 + Vite
- Vue Router
- Pinia（`frontend/src/stores/auth.js`）
- Element Plus + Tailwind CSS
- 图片裁剪：CropperJS（`vue-cropperjs`）
- 字体：Outfit / Plus Jakarta Sans（本地自托管，见 `frontend/public/fonts/`）

### 2.2 后端
- Node.js（ESM）+ Express（当前使用 5.x）
- Sequelize ORM（支持 MySQL；测试使用 SQLite）
- JWT（认证）+ bcrypt（密码哈希）
- multer（上传）+ sharp（缩略图/图片处理）
- exif-parser（EXIF 解析）
- swagger-ui-express（OpenAPI 文档）

### 2.3 外部服务（可选）
- Google Gemini：AI 标签生成、自然语言解析
- 高德地图（AMap）：GPS 逆地理（用于填充 `province/city`；并可生成地点路径标签）

---

## 3. 总体架构

### 3.1 组件与数据流

```mermaid
graph TB
  subgraph FE["前端（Vue SPA）"]
    FE1[登录/注册]
    FE2[图库/详情/轮播]
    FE3[搜索（条件 + NL）]
    FE4[编辑器（裁剪 + 调色）]
  end

  subgraph BE["后端（Express + Sequelize）"]
    BE1[Auth]
    BE2[Images]
    BE3[Tags]
    BE4[Search/NL Search]
    BE5[Carousel]
    BE6[EXIF/Thumbnails]
    BE7[AI(Gemini)]
    BE8[Maps(AMap)]
  end

  subgraph DB["数据层"]
    DB1[(MySQL)]
    FS[(Uploads Volume)]
  end

  FE -->|REST + JWT| BE
  BE --> DB1
  BE --> FS
  BE7 -->|HTTPS| AI[(Gemini)]
  BE8 -->|HTTPS| AMAP[(AMap)]
```

### 3.2 “大模型对话检索”能力说明
课程文档提到 “提供 mcp 接口，能通过大模型对话方式检索图片”。当前实现以 **REST API 的自然语言检索接口**承载该能力：
- `POST /api/images/nl-search`：用户自然语言 → Gemini 解析 → 结构化条件 → 统一搜索链路 → 返回图片列表

本仓库未实现完整的 MCP 协议 Server（协议层）。如课程验收需要，可在现有 `/api/images/nl-search` 的基础上再封装 MCP 工具层。

---

## 4. 功能模块设计（与代码对应）

### 4.1 前端页面与核心组件

**页面（`frontend/src/views/`）**
- `Login.vue` / `Register.vue`：认证入口
- `Gallery.vue`：图库（列表 + 搜索面板 + 轮播入口）
- `ImageDetail.vue`：详情（标签编辑、AI 标签、元信息侧栏、删除、进入编辑）
- `Editor.vue`：图片编辑（裁剪、旋转、亮度/对比度/饱和度/色相）
- `NotFound.vue`：404

**组件（`frontend/src/components/`）**
- `AppShell.vue`：整体布局（顶栏/容器/响应式）
- `ImageUploader.vue`：上传（多文件、进度/提示）
- `ImageGrid.vue`：缩略图网格 + 轮播“★”按钮
- `ImageCarousel.vue`：轮播展示（基于“轮播列表”）
- `SearchPanel.vue`：条件搜索 + 自然语言搜索（含空态/错误提示）
- `TagEditor.vue`：添加/删除标签、生成 AI 标签、区分 `custom/ai/auto` 样式

### 4.2 后端路由与分层

**路由（`backend/src/routes/`）**
- `auth.js`：注册、登录、获取当前用户
- `images.js`：上传、列表、详情、删除、保存编辑副本
- `tags.js`：图片标签增删、列出标签、生成 AI 标签
- `search.js`：条件搜索、自然语言搜索
- `carousel.js`：轮播列表增删查

**控制器（`backend/src/controllers/`）**  
负责参数校验、鉴权后的用户隔离、序列化输出。

**服务（`backend/src/services/`）**
- `images.js`：保存原图与缩略图、删除文件、生成公开 URL
- `maps.js`：GPS 逆地理（AMap）
- `autoTags.js`：自动标签（时间路径、地点路径）
- `gemini.js`：Gemini 调用（含超时配置）
- `tagInheritance.js`：编辑副本继承原图标签（批量写入）

---

## 5. 数据设计

### 5.1 主要表（MySQL）
建表脚本位于 `docker/mysql/init.sql`，后端启动时也会做部分“自检/补齐”（`backend/src/db/ensureSchema.js`）。

- `user`：用户
- `image`：图片记录（原图/缩略图路径、尺寸、是否编辑副本、父图关联、上传时间）
- `image_metadata`：EXIF/元信息（拍摄时间、GPS、地名、省/市、设备参数、分辨率）
- `tag`：标签（`tag_type in ('custom','ai','auto')`）
- `image_tag`：图片-标签关联（联合唯一，防重复）
- `carousel_item`：轮播列表（按用户隔离，最多 20 张）

### 5.2 标签类型约定
- `custom`：用户手动添加
- `ai`：AI 生成（用户可删除）
- `auto`：系统自动生成（目前用于“时间/年”与“地点/省/市”路径标签）

---

## 6. 核心业务流程

### 6.1 上传（缩略图 + EXIF + 自动标签）
1. 前端多文件上传至 `POST /api/images/upload`
2. 后端 `multer` 接收文件，保存原图到 `UPLOADS_DIR`
3. `sharp` 生成两种缩略图（small/medium）
4. `exif-parser` 提取拍摄时间、GPS、设备信息等
5. 如有 GPS 且配置 `AMAP_API_KEY`，调用高德逆地理填充 `province/city`
6. 写入 `image` / `image_metadata`
7. 调用 `applyAutoTags` 生成自动标签（默认至少生成 `时间/{year}`）

### 6.2 AI 标签
1. 前端点击“生成 AI 标签”
2. 后端调用 Gemini Vision，对图片进行内容识别
3. 将结果写入 `tag(tag_type='ai')` 并关联到图片（去重）

### 6.3 自然语言搜索（NL Search）
1. 前端提交自然语言到 `POST /api/images/nl-search`
2. 后端调用 Gemini Text 将 NL 转为结构化条件（如标签、时间范围、关键词等）
3. 走统一搜索链路（按用户隔离），返回图片列表
4. 如解析失败，前端展示错误原因并提示改用条件搜索

### 6.4 编辑（裁剪 + 调色，保存新副本）
1. 前端 `Editor.vue` 使用 CropperJS 做裁剪，CSS filter 做预览
2. 保存时使用 Canvas 将滤镜“烘焙”进导出图（`ctx.filter + drawImage`），导出为 JPEG blob
3. 上传到 `POST /api/images/:id/edit`
4. 后端保存新图片记录（`is_edited=true`，`parent_image_id` 指向原图）
5. 新副本文件名按序号生成：`原名(1).ext`、`原名(2).ext`……
6. 新副本自动继承原图标签，并同样写入元信息与自动标签

---

## 7. 部署设计（Docker Compose）

### 7.1 生产模式（profile: `prod`）
- `mysql` + `backend` + `frontend`
- 数据持久化：`mysql-data`、`upload-data`（docker volume）

### 7.2 开发模式（profile: `dev`）
- `backend-dev`/`frontend-dev` 将本地代码 bind-mount 到容器，避免频繁重建镜像
- 仍复用 `mysql` 与 `upload-data`，便于调试数据/文件持久化

---

## 8. 相关文档入口
- OpenAPI：`backend/src/openapi.yaml`（服务启动后通过 Swagger UI 查看）
- 需求规格说明书：`docs/requirements.md`
- 测试报告：`docs/test-report.md`
- 开发小结：`docs/dev-summary.md`

