# PicHub

智能图片管理系统（课程大作业）。功能：上传/缩略图/EXIF、标签（自定义/AI）、多条件搜索、基础编辑、自然语言搜索

## 快速开始（Docker）
1. 复制并填写环境变量：`cp .env.example .env`
2. 启动（生产模式）：`docker compose --profile prod up -d --build`（或 `./start.sh`）
3. 访问：
   - 前端：`http://localhost`
   - 后端：`http://localhost:8080`
   - API Docs：`http://localhost:8080/api-docs`

## Docker 开发模式（代码挂载/热更新）
- 启动：`docker compose --profile dev up -d --build`
- 访问前端（Vite）：`http://localhost:5173`

## 本地开发（非 Docker）
- 后端：
  - `cd backend && npm i`
  - 配置数据库环境变量（见 `.env.example`）
  - `npm run dev`
- 前端：
  - `cd frontend && npm i`
  - `npm run dev`
