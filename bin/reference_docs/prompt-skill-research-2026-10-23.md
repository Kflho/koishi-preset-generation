# 提示词 / 世界书 规范与修改 skill —— 调研（2026-10-23）

**结论先说**：有成熟方案，但没有现成的「ChatLuna 预设提示词撰写/修改」skill。
成熟的是三段材料——**格式规范**（ChatLuna 官方文档）、**匹配与注入语义**（chatluna 源码，
一手实测）、**世界书工程经验**（SillyTavern World Info）。我们要做的只是把这三段拼成一张
「只改注入/规则层、不动人设」的检查单。

## 证据卡

### 1. ChatLuna 预设格式文档（内部一手）

- 来源：`bin/requirements/预设文档.md`（仓库自带；本机 2026-10-23 读）
- 主张：预设 = `keywords` + `prompts` + `world_lores` + `format_user_prompt` + `config`；
  世界书第一条无 `keywords` 的项是默认配置（`scanDepth`/`tokenLimit`/`recursiveScan`/
  `maxRecursionDepth`）；条目支持 `keywords`（可正则）、`constant`、`matchWholeWord`、
  `caseSensitive`、`enabled`；`authors_note` 可按频率/深度插入。
- 条件：只对 ChatLuna 1.3.x 的预设文件成立。
- 复用：**直接采用**（格式以它为准）。
- 注意：文档说「token 超过 `tokenLimit` 就停止扫描」，与源码不一致（见第 2 条）。

### 2. chatluna 1.3.36 源码（一手，实测）

- 来源：实例 `node_modules/koishi-plugin-chatluna/lib/index.cjs` 的 `LoreBookMatcher`；
  `lib/llm-core/prompt/index.cjs` 的注入拼装（副本在
  `dev/dialogues/_server/chatluna-index.js`、`chatluna-prompt-index.js`）
- 主张（与写 skill 直接相关的四条）：
  1. **命中只看关键词**：`scanDepth` 取「当前消息 + 最近 N−1 条」（倒序后 slice），
     关键词按**正则**、**默认区分大小写**（`caseSensitive` 默认 true），
     `matchWholeWord` 默认 false；
  2. **`tokenLimit` 不参与命中**：它在拼上下文时作为预算保留量；某条内容超预算时
     直接 `break`，后面的条目不再注入——所以「先命中谁」由条目顺序 + 预算共同决定；
  3. `constant: true` 无条件命中；`recursiveScan: false` 时不做关键词递归；
  4. 命中后按 `config.loreBooksPrompt` 模板渲染成一条 **human** 消息注入（默认 `{input}`），
     这就是「模型把设定当成用户刚发来的资料」的根因。
- 条件：chatluna 1.3.36；升级 1.4.x 后需重核。
- 复用：**直接采用**（判断命中/写检查脚本都以源码为准，文档口径记作待修）。
- 改动点：`docs` 里「tokenLimit 停止扫描」的表述，改成「预算保留量，超预算条目跳过」。

### 3. SillyTavern World Info 文档（成熟产品，二手一手混合）

- 来源：<https://docs.sillytavern.app/usage/core-concepts/worldinfo/>（2026-10-23 抓取）
- 主张：条目可互相引用（recursive activation）；有 insertion order / insertion position；
  上下文预算可调；建议条目内容精简以省 token；位置的深浅影响模型注意力。
- 条件：SillyTavern 的 UI/格式，不能直接搬到 ChatLuna；语义同源。
- 复用：**参考思路**——借「顺序决定预算分配」「位置影响强度」「条目要短」三条，
  落到 ChatLuna 的 `order` / 条目切分 / `loreBooksPrompt` 上。

### 4. Anthropic Prompt Engineering 教程（官方，一手）

- 来源：<https://github.com/anthropics/prompt-eng-interactive-tutorial>（README 与章节，
  2026-10-23 抓取；直连 docs.anthropic.com 被区域限制挡了）
- 主张：好提示 = 清晰结构 + 明确角色/任务 + 例子（few-shot）+ 分步思考；
  先找失败模式，再用少量高频技巧（80/20）修；建议用 XML 标签分隔内容。
- 条件：面向通用 LLM；角色扮演场景要再落到"视角/口吻/边界"。
- 复用：**采用**为检查清单来源（结构、示例、失败模式、分隔），不照抄措辞。

### 5. Prompt Engineering Guide（社区汇总，三手）

- 来源：<https://www.promptingguide.ai/techniques>（2026-10-23 抓取）
- 主张：few-shot、CoT、self-consistency、ReAct 等技巧名目与示例。
- 条件：通用技巧汇编，不针对角色扮演/世界书。
- 复用：**只作线索**（找技巧名），不当作依据。

### 6. skill 写法（本机已有，一手规范）

- 来源：`kf-personal-development/references/skill-dev.md`、本机已装 `writing-great-skills`
- 主张：skill = 触发条件 + 输入 + 步骤 + 检查项 + 产出物；改 skill 与测 skill 分离；
  宁短勿长，指针化引用。
- 复用：**直接采用**（草案按它的结构写）。

## 有没有成熟方案？分项判定

| 需求 | 成熟方案 | 判定 |
|---|---|---|
| 预设 YAML 格式、字段语义 | ChatLuna 官方文档 | 直接采用 |
| 命中/注入的真实行为 | chatluna 源码 | 直接采用（以此为准） |
| 世界书怎么组织才不炸上下文 | SillyTavern 经验 | 参考思路 |
| 提示词写法与失败模式 | Anthropic 教程 | 采用为清单 |
| 现成的「ChatLuna 预设修改 skill」 | **没有** | 自研薄层（拼上面四块） |

## 从证据直接得出的基线检查项（草案用）

1. **人设层不能动**（性格/说话方式/行为规则/对话示例/基本信息）——skill 第一步就要拦住；
2. 只改四类：`config.loreBooksPrompt`、`### 角色扮演强制规则`、`keywords`、条目切分；
3. 关键词检查：单字（除「渚」）、高频日常词（未来/日向/小雪/一花…）、大小写敏感
   （英文关键词写 `Cure White` 就只认这个大小写；需要忽略大小写就在条目里写 `caseSensitive: false`）；
4. 预算检查：条目内容长度 × 0.66 ≈ token；单条过大时它会挤掉后面的条目（源码 `break`），
   所以「高频条目要短、低频大条目往后放」；
5. 注入视角：`loreBooksPrompt` 必须声明「这是你早已知晓的记忆」而不是用户消息，
   且模板里只能有 `{input}` 一个变量；
6. YAML 禁区：行首 `#`、`content: |-` 后非缩进行——改完必须 `validate_preset.js` 0 errors；
7. 每轮产物用独立标签（`10.23-r1`），旧目录不覆盖。

## 未解决 / 待核

- 文档与源码关于 `tokenLimit` 的表述冲突：以源码为准，文档待修；
- `caseSensitive` 默认 true 与文档「matchWholeWord/caseSensitive 可在条目里设」的交互，
  还没在真机上分别验证过（当前条目都没设这两项，等价于默认）；
- Anthropic docs 官网被区域限制，教程用 GitHub 源；若需引用具体章节措辞，得再取原站。
