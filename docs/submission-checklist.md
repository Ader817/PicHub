# PicHub 提交清单（建议按课程要求打包）

## 1. 代码与 Git 信息
- 源代码：整个仓库（包含 `frontend/`、`backend/`、`docker/` 等）
- Git 提交记录：打包时附带一份 `git log` 输出
  - 示例：`git log --oneline --decorate --graph --max-count=200 > git-log.txt`

## 2. Docker 与数据库脚本
- `docker-compose.yml`（支持 `--profile prod`/`--profile dev`）
- `docker/mysql/init.sql`（建库建表脚本）
- `.env.example`（不要提交真实密钥）
- `start.sh`（如使用）

## 3. 文档（建议放入压缩包）
- 实验报告封面（按老师模板）
- 设计文档：`docs/design.md`
- 需求规格说明书：`docs/requirements.md`
- 使用手册：`docs/user-manual.md`（或根目录 `README.md` 也可作为简化版）
- 测试报告：`docs/test-report.md`
- 开发小结：`docs/dev-summary.md`

## 4. 演示视频（5–10 分钟）
建议覆盖以下流程：
- 注册/登录
- 上传（含 EXIF 图片）→ 查看元信息与自动标签
- 自定义标签 + AI 生成标签
- 条件搜索 + NL 搜索（展示解析成功/失败提示）
- 加入轮播并播放
- 编辑（裁剪/调色）保存副本（标签继承 + 命名序号）
- 删除
- 手机宽度展示（浏览器缩放或真机）

## 5. 注意事项
- 如需演示 AI/NL 搜索，请确保 `.env` 中配置 `GEMINI_API_KEY` 且网络可访问 Google API
- 如老师强制要求“完整 MCP 协议 Server”，当前实现提供的是可被大模型调用的 REST 自然语言检索接口（`/api/images/nl-search`）；可在此基础上再封装 MCP 协议层，不影响核心业务逻辑

