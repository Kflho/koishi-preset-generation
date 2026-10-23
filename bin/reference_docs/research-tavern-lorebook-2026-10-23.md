# 酒馆（SillyTavern）世界书资料调研（2026-10-23，首版）

**用途**：功能 1.3。搞清楚 SillyTavern 世界书的写法惯例，和本仓
`光之美少女世界书酒馆版.json`（只读）对照，给 Koishi 版世界书的改写/增删提供依据。
**边界**：酒馆版只读；调研结论只作建议。

## 来源

| 级别 | 来源 | 抓取日期 |
|---|---|---|
| 一手 | 本仓 `bin/requirements/世界书/光之美少女世界书酒馆版.json`（1.53 MB，179 条） | 2026-10-23 |
| 一手 | SillyTavern 官方文档 World Info <https://docs.sillytavern.app/usage/core-concepts/worldinfo/> | 2026-10-23 |
| 一手 | 本仓 `bin/requirements/预设文档.md`（ChatLuna 侧格式） | 2026-10-23 |
| 二手 | `CLAUDE.md` 的转换记录（`convert_world_book.js` 的行为） | 2026-10-23 |

原文副本：`dev/dialogues/_research/sillytavern-worldinfo.txt`。

## 1. 酒馆版的实际数据（只读统计）

| 项 | 全部 179 条 | 仅启用 26 条 |
|---|---|---|
| `constant: true` | 8 | 7 |
| `selective: true` | 179 | 26 |
| `keysecondary` | 3 | 1 |
| `disable: true` | 153 | — |
| 关键词总数 / 去重 | 557 / 352 | 120 / 96 |
| 单字关键词（去重后） | 40 | 14 |
| 正文字符数 | 609,427 | 123,200 |
| 平均每条 | 3,404 | 4,738 |
| `order` | 全部 100 | 全部 100 |
| `position` | 0:116、1:55、4:8 | 同比例 |
| `depth` | 全部 4 | 全部 4 |
| `probability` | 全部 100 | 全部 100 |
| `scanDepth` | 全为 null（用默认） | 同 |
| `caseSensitive` / `matchWholeWords` | 全 false | 同 |

## 2. 酒馆字段 → ChatLuna 映射

| SillyTavern | ChatLuna（`world_lores`） | 转换后 |
|---|---|---|
| `key`（关键词列表） | `keywords` | 保留，但单字/高频词要清 |
| `keysecondary`（次级关键词） | 无对应 | **丢弃**（`selective=true` 时）→ 精度损失 |
| `selective` | 无 | 丢弃 |
| `content` | `content` | 保留 |
| `constant` | `constant` | 保留语义（Koishi 版已全部清成 0） |
| `order` | `order`（matcher 按它排序） | 可保留；Koishi 版全部未设（=0） |
| `position` / `depth` | 无对应（ChatLuna 注入的位置固定为一条 human 消息） | 丢弃 |
| `probability` | 无 | 丢弃 |
| `scanDepth` | `scanDepth` | 保留（null → 用默认 2） |
| `caseSensitive` / `matchWholeWords` | 同名（注意默认值不同） | 需显式设置 |
| `disable` | `enabled`（反向） | 只转启用条目 |
| `excludeRecursion` / `preventRecursion` | 只有全局 `recursiveScan` | 丢弃 |
| `group` / `groupWeight` | 无 | 丢弃 |

## 3. 两边默认值不一样，最容易踩的坑

| 项 | SillyTavern | ChatLuna |
|---|---|---|
| 大小写 | `caseSensitive: false`（不区分） | matcher 默认 **区分**（apply 时未传该字段） |
| 整词匹配 | 默认 false（子串） | 默认 false（子串，一致） |
| 注入位置 | 可选 position/depth | 固定一条 human 消息（由 `loreBooksPrompt` 渲染） |
| 常驻 | 允许 8 条 | 现为 0 条（成本控制） |

**结论**：英文关键词（`Cure White`、`precure`）从酒馆转过来后，大小写行为会变；
需要不区分时必须显式写 `caseSensitive: false`。

## 4. Koishi 版现状（`光之美少女世界书Koishi版.yml`）

`node src/audit_world_book.js`（2026-10-23）：

- 条目 126 条（关键词条目），`constant` 0 条；
- 单字关键词仅 1 个（「渚」，按守则豁免）；
- 无正则元字符关键词；
- `matchWholeWord` / `caseSensitive` / `order` 都没设置（全用默认）；
- 默认配置：`scanDepth: 2`、`tokenLimit: 1000`、`recursiveScan: false`。

## 5. 对我们的适用结论（采纳 / 不采纳）

| 酒馆惯例 | 采纳？ | 怎么落 |
|---|---|---|
| 关键词短、靠条目标题带语境 | **采纳** | 现有做法已如此；新增条目关键词 ≤2–3 个 |
| 单字关键词 | **不采纳** | 酒馆启用条目有 14 个单字词；Koishi 只保留「渚」 |
| 常驻条目 | **不采纳**（当前 0） | 恢复要有明确理由且 ≤4K 字符 |
| 次级关键词（`keysecondary`） | 参考 | ChatLuna 无对应；需要时拆成两套关键词或换更具体关键词 |
| `order` 控制预算顺序 | **参考** | ChatLuna 支持 `order`；本轮不动，等出现"大条目挤掉小条目"再排 |
| `position` / `depth` | **不采纳** | ChatLuna 注入位置固定，靠 `loreBooksPrompt` 包装解决"像不像资料" |
| 条目内容精简（酒馆文档建议） | **采纳** | 改写目标：一条说清一件事，平均 4.7K 字符太大，往 1–2K 收 |
| 「人物关系/事件用叙述句」 | **采纳** | 与功能 3「预设视角」一致：写"她怎么看"，不写百科条目 |

## 6. 复核（随机抽 3 条回查）

1. **`keysecondary` 只在 `selective=true` 时有效** → SillyTavern 文档 Selective Logic 段：
   次级关键词配合选择性逻辑使用；本仓转换脚本按 `CLAUDE.md` 记录丢弃它。一致。
2. **`constant` 条目每次都注入** → 酒馆文档「Constant」条目与 ChatLuna 文档 `constant`
   表述一致；两版都这么写。
3. **单字关键词会误触发** → 酒馆文档虽未直接警告，但 `scanDepth`/子串匹配机制下成立；
   本仓 `CLAUDE.md` 有 2026-07-27 事故记录（单字/高频词导致全量注入），属一手经验。

## 待核

- 酒馆版 `position: 4`（8 条）在 SillyTavern 里对应哪种插入位置（文档有 outlet/AN 等模式），
  与 Koishi 版无映射，记录即可，不影响转换；
- 启用条目的平均 4.7K 字符远超 Koishi 版目标（1–2K），改写批次以「先小后大」为序。

## 剔除清单（按 1.2 调研规范）

| 剔除项 | 类型 | 依据 |
|---|---|---|
| `position` / `depth` / `probability` / `group` 字段映射 | 平台差异 | ChatLuna 的 world_lores 没有对应字段，转换即丢弃 |
| 酒馆启用条目里的 40 个单字关键词 | 危险 | 子串匹配易误触发；Koishi 版只留「渚」 |
| 酒馆的 8 条常驻条目 | 成本 | 常驻每条都注入；Koishi 版保持 0 条 |
| `keysecondary` 次级关键词 | 平台缺失 | ChatLuna 无对应语义，记录为精度损失 |
| 启用条目平均 4.7K 字符的描写性内容 | 冗余 | 只取「她该知道的要点」，改写目标 1–2K |
