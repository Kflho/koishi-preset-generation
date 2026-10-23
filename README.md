# ko_01 — 雪城穗乃香 角色预设（Koishi / ChatLuna）

把「手写预设 + 世界书」拼成 ChatLuna 可加载的最终预设，并按轮次归档生成物；
配套一套可复现的对话测试脚本，用来验证注入/规则层的改动。

## 常用命令

```bash
node src/integrate_preset.js            # 拼接到 bin/exports/presets/<今天 MM.DD>/
node src/integrate_preset.js 10.23-r1   # 指定轮次标签（别复用旧标签，旧目录不覆盖）
node src/validate_preset.js <日期或产物路径>   # 0 errors 才算通过
node src/audit_world_book.js            # 世界书体检：常驻大小/单字关键词/递归风险
```

## 目录

```text
src/                       脚本（integrate / validate / audit / prune / convert / extract）
bin/requirements/          手写源文件（预设、世界书；酒馆 JSON 只读）
bin/reference_docs/        调研与规范（角色调研、提示词 skill 调研、skill 草案）
bin/exports/presets/       生成物，按轮次归档，gitignore
bin/data/                  中间产物，gitignore（保留 .gitkeep）
dev/                       开发专属（对话测试脚本、日志、当轮记录），gitignore
```

## 边界（改之前先读）

- **人设层不可改**：性格、说话方式、行为规则、对话示例、基本信息；
- 只允许改**注入/规则/关键词层**：`config.loreBooksPrompt`、`### 角色扮演强制规则`、
  `keywords`、条目切分、`scanDepth`；
- YAML 禁区：源文件禁止行首 `#` 注释；`content: |-` 后禁止非缩进行；
- 改完必须 `validate_preset.js` 0 errors；产物按轮次标签归档、不覆盖旧目录；
- 回滚用 git，不手抄 `.bak`。

## 文档

- `bin/reference_docs/prompt-skill-2026-10-23.md`：提示词撰写/修改的执行单（分层、检查项、指标）；
- `bin/reference_docs/prompt-skill-research-2026-10-23.md`：调研证据卡（ChatLuna 文档/源码、
  SillyTavern、Anthropic 教程）；
- `bin/reference_docs/character-research-2026-10-23.md`：角色官方设定与二创边界；
- `CLAUDE.md`：构建流水线、YAML 禁区、世界书守则的完整说明。
