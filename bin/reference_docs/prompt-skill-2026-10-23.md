# skill 草案：ChatLuna 预设提示词撰写与修改（2026-10-23，第 1 版）

> 目标：**下次改预设能照着做**。只覆盖「注入层 / 规则层 / 关键词层」，人设层不动。
> 依据：`prompt-skill-research-2026-10-23.md` 的证据卡（ChatLuna 文档 + 源码 +
> SillyTavern 经验 + Anthropic 教程）。

## 触发条件

出现下面任一情况时用这个 skill：

- 用户描述「她应该是这样」「这句要改」→ 判断落在哪一层（见「分层」）；
- 对话测试发现问题：出戏、误触发、该触发没触发、太长/重复；
- 要新增/调整世界书条目、关键词、`loreBooksPrompt`、`### 角色扮演强制规则`；
- 升级 chatluna 后要重核命中/注入行为。

## 硬边界（先看，违反就停）

| 层 | 内容 | 能不能改 |
|---|---|---|
| 人设层 | 性格、说话方式、行为规则、对话示例、基本信息 | **不能改**；用户没说不动，就只记录不动手 |
| 规则层 | `### 角色扮演强制规则`、`config.loreBooksPrompt` | 可改，需写依据 |
| 关键词层 | `keywords`、`scanDepth`、`caseSensitive`、条目切分、顺序 | 可改，需写依据 |
| 产物层 | `bin/exports/`、`dev/` 日志 | 只生成、不手改 |

人设核心要动的，先出回执说明改什么/为什么/依据，**等用户确认**。

## 输入

1. 用户原话（必须原文引用，不改写、不润色）；
2. 当前源文件：`bin/requirements/穗乃香_预设/穗乃香_预设.yml`、`bin/requirements/世界书/*.yml`；
3. 最近一次对话日志（`dev/dialogues/logs/*.jsonl`）与命中计划（`lores_match.py` 输出）；
4. `validate_preset.js` / `audit_world_book.js` 的输出。

## 步骤

0. **读基线**：`git status` 必须干净；跑一次 `node src/validate_preset.js` 确认现有产物 0 errors；
   若已有对话日志，先看一遍，把问题写成一句话（现象 + 用例编号 + 期望）。
1. **分层判定**：把要改的点放进上表四层之一；落不进「规则/关键词」的，停手回执。
2. **写变更单**（先写后改，一句话一条）：
   - 改哪个文件哪一段；
   - 依据（用户原话 / 日志里的哪一轮 / 哪条调研结论）；
   - 预期指标（该命中的命中率、误触发数、出戏次数、平均长度）；
   - 失败判据（什么情况算退步，直接回滚）。
3. **小步改**：一次只改一类；保留原措辞与版块顺序；探索性大改先复制到 `dev/` 试。
4. **集成（按日期标签，不覆盖）**：
   ```bash
   node src/integrate_preset.js 10.23-r1     # 新标签，别复用旧目录
   ```
5. **校验**：`node src/validate_preset.js 10.23-r1` 必须 **0 errors**；warning 逐条看。
6. **对话测试**（在 Koishi 主机上，busy 感知的客户端）：
   ```bash
   node dev/dialogues/dialog_client.cjs --inst <实例> \
     --cases dev/dialogues/cases-baseline.json --out <日志.jsonl>
   ```
   再用 `dev/dialogues/lores_match.py --preset <新产物> --log <日志>` 算命中计划。
7. **对比**：同一批用例，与上一轮日志逐条对比；指标退步就 `git checkout -- <文件>` 回滚，
   产物目录留着不动。
8. **记录**：`dev/dialogues/2026-10-2x-rN.md` 写「现象 → 改动（哪一层）→ 复测结果 → 结论」；
   提交信息写清改了哪一段、依据是什么。

## 检查项（改完逐条打勾）

- [ ] YAML 禁区：源文件无行首 `#`；`content: |-` 后无非缩进行（`validate_preset.js` 致命项）
- [ ] 关键词：无单字（例外「渚」）；无高频日常词（未来/日向/小雪/一花/blue/向阳/真夏/珊瑚/心音/永久…）
- [ ] 大小写：英文关键词默认**区分大小写**（源码 `caseSensitive` 默认 true）；要不区分就写
      `caseSensitive: false`
- [ ] 顺序与预算：单条内容长度 ÷ 1.5 ≈ token；**超预算的条目会挤掉后面的条目**（源码 `break`），
      所以高频条目要短、大条目靠后
- [ ] 扫描窗口：`scanDepth: 2` = 当前消息 + 最近 1 条（含机器人回复），别假设只扫用户输入
- [ ] 常驻条目：`constant: true` 目前保持 0 个；要恢复只留最核心定义（≤4K 字符）
- [ ] 递归：`recursiveScan: false`
- [ ] 注入模板：`loreBooksPrompt` 只能有一个 `{input}` 变量；措辞声明「这是你早已知道的事」，
      不写「你必须……」
- [ ] 重复关键词 / 重复 world_lores 段（validate 会报）
- [ ] 人设层零 diff：`git diff -- bin/requirements/穗乃香_预设/穗乃香_预设.yml` 里没有人设段改动

## 指标（一轮至少看四个）

| 指标 | 算法 | 目标 |
|---|---|---|
| 命中符合率 | 与 `lores_match.py` 的命中计划对比（应命中/不应命中） | 应命中全中、误触发 0 |
| 出戏次数 | 回复里是否出现「设定/资料/世界书/刚知道」或 AI 自指 | 0 |
| 角色一致性 | 多轮里称呼、语气、`欺负人` 等口头反应是否稳定 | 人工判读，记「稳/飘」 |
| 长度与延迟 | 每轮字数、`latencyMs` | 不因改动暴涨 |

## 产出物

- 源文件 diff（逐条可读）；
- 新产物目录 `bin/exports/presets/10.23-rN/`（旧目录不动）；
- 对话日志 `dev/dialogues/logs/<日期>-rN.jsonl`；
- 当轮记录 `dev/dialogues/<日期>-rN.md`。

## 反模式

- 整段重写、顺手重构人设措辞；
- 给测试用例特判、为过测试改期望值、凑回复；
- 复用/覆盖旧产物目录；手抄 `.bak` 当备份；
- 没测就改、改完不 validate；
- 用「业界都这么做」当依据（每条改动要能指到日志或源码）。

## 已知边界

- 命中计划是**离线复算**（按源码语义），token 是估算；真实注入还要看预算与 `loreBooksPrompt` 渲染；
- chatluna 升级到 1.4.x 后，`LoreBookMatcher` 与注入逻辑要重核，本 skill 的「检查项」需同步。
