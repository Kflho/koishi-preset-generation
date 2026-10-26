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

对话测试统一用 `deepseek/deepseek-flash`（与 QQ 线上房间一致；v4-pro 贵，只在明确要求时用）。
实例 `defaultModel` 已是 flash（2026-10-26），新房间默认 flash；旧 pro 房间先发
`/chatluna.room.set -m deepseek/deepseek-flash` → `Y` 再测。

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

- **人设核心不可改**：性格、说话方式、行为规则、基本信息；
- **对话示例**：展现人设 / 角色互动（关键剧情）/ 特殊互动（破墙）三个子节；可在用户要求下增补
  （先草稿、后合入）；现有示例不删改；
- **分层**：素材 / 知识进世界书（`特殊互动素材` 等条目），对话风格 / 参考例子留预设；
- 只允许改**注入/规则/关键词层**：`config.loreBooksPrompt`、`### 角色扮演强制规则`、
  `keywords`、条目切分、`scanDepth`；
- YAML 禁区：源文件禁止行首 `#` 注释；`content: |-` 后禁止非缩进行；
- 改完必须 `validate_preset.js` 0 errors；新增对话例子 / 世界书条目后还要跑预设调试（对话测试）；
  产物按轮次标签归档、不覆盖旧目录；
- 回滚用 git，不手抄 `.bak`。

## 文档

- `bin/reference_docs/prompt-skill-2026-10-23.md`：提示词撰写/修改的执行单（分层、检查项、指标；
  含「对话例子编写 / 三类例子 / 预设调试」章）；
- `bin/reference_docs/prompt-skill-research-2026-10-23.md`：调研证据卡（ChatLuna 文档/源码、
  SillyTavern、Anthropic 教程）；
- `bin/reference_docs/research-special-interaction-2026-10-26.md`：特殊互动素材卡（声优/同年代/
  同题材/同公司/作者/名字/关键剧情，含 2004 时间线边界）；
- `bin/reference_docs/dialogue-examples-special-2026-10-26.md`：特殊互动对话例子银行（24 条 +
  互动点 + 退化判据 + 测试映射；含同班/同系列声优梗与履历挡板）；
- `bin/reference_docs/research-character-2026-10-23.md`：角色官方设定与二创边界；
- `bin/reference_docs/research-story-2026-10-23.md`：作品世界观、舞台、时间线与知识边界；
- `bin/reference_docs/research-tavern-lorebook-2026-10-23.md`：酒馆世界书写法惯例与字段映射；
- `CLAUDE.md`：构建流水线、YAML 禁区、世界书守则的完整说明。
