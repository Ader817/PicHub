# PicHub

智能图片管理系统（B/S 课程大作业）。实现了所有的基本功能以及增强功能，包括：上传/缩略图/EXIF、标签（自定义/AI）、多条件搜索、基础编辑、自然语言搜索等

## 文档
- 设计文档：`docs/design.md`
- 需求规格说明书：`docs/requirements.md`
- 使用手册：`docs/user-manual.md`
- 测试报告：`docs/test-report.md`
- 开发小结：`docs/dev-summary.md`

## 快速开始
1. 复制并填写环境变量：`cp .env.example .env`
2. 启动（生产模式）：`docker compose --profile prod up -d --build`（或 `./start.sh`）
3. 访问：
   - 前端：`http://localhost`
   - 后端：`http://localhost:8080`
   - API Docs：`http://localhost:8080/api-docs`

## 开发模式
- 启动：`docker compose --profile dev up -d --build`
- 访问前端（Vite）：`http://localhost:5173`
