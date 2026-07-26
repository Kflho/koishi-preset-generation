# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 穗乃香角色预设工作指南

本仓库维护 Koishi/ChatLuna 用的「雪城穗乃香」角色预设：把预设源文件与世界书拼接成最终可加载的预设文件，按日期归档到 `预设/<MM.DD>/穗乃香.yml`。

## 常用命令

```bash
node scripts/integrate_preset.js              # 拼接预设 + 世界书 → 预设/<今天日期>/穗乃香.yml（日常命令）
node scripts/integrate_preset.js 07.18        # 指定日期（如需要覆盖历史版本）
node scripts/convert_world_book.js --force    # 一次性：酒馆 JSON → Koishi 世界书 YAML（会覆盖手动修改，勿随意重跑）
```

脚本内路径以脚本所在位置（`__dirname/..`）解析，任意工作目录下运行均可；若移动/重命名源文件，需同步更新脚本顶部的路径常量。

## 构建流水线

**核心规则：`光之美少女世界书酒馆版.json` 是只读原文件，任何情况下不得修改。所有世界书内容修改（关键词、条目内容、增删条目）直接在 `光之美少女世界书Koishi版.yml` 中手动进行。**

手动维护的文件：`穗乃香_预设.yml`、`穗乃香_世界书.yml`、`光之美少女世界书Koishi版.yml`；最终输出 `预设/<日期>/穗乃香.yml` 是生成物，不要手改。

1. **`convert_world_book.js`**（一次性提取，已完成）：从酒馆（SillyTavern）格式 JSON 提取启用（`!disable`）条目，生成 `光之美少女世界书Koishi版.yml` 初稿。此后 Koishi 版即为手动维护的主文件——**重跑此脚本会覆盖所有手动修改**（脚本已加 `--force` 保护）。转换细节：`selective=true` 的条目丢弃 `keysecondary`；keyword 触发条目在前，constant（常驻）条目在后；文件头部为无 keywords 的全局配置条目（scanDepth/tokenLimit 等）。
   - 2026-07-16 已用 `scripts/extract_disabled_entries.js`（一次性，已加防重跑保护）把酒馆版中原禁用条目也提取进 Koishi 版：同角色「普通/满级」双版本只取满级、关键词取并集；私设/原设冲突取原设；跳过 {{user}} 条目与空条目。雪城穗乃香自身条目未提取（与手动条目重复），其 Max Heart 知识归并为 `穗乃香_世界书.yml` 中「第二部_Max_Heart_未来知识」版块（框定为尚未发生的未来，按「其他光之美少女知识→应对方式」的口径回答）。
   - 2026-07-16 已按用户决定清理作者私设（`scripts/prune_fanon.js`，一次性）：删除「心之钻石/法则」心理分析段（66 处）、世界观构建 5 条同世界框架（基础法则/世界概况/地理划分/反派组织/暗之力）、作者评述句、私设角色普卡、开局-和平。保留 SD 系列（真未来市）、EX 电影角色、转生表述。
2. **`integrate_preset.js`**：
   - 将 `穗乃香_世界书.yml` 插入为 world_lores 的**第一个** keywords 条目。该文件为可读性书写时不带 2 空格缩进，脚本会自动缩进，并剥离 `#` 注释行与空行。
   - 将整个 world_lores 块插入预设源文件中 `format_user_prompt:` 之前。
   - 写出前自动把旧的 `穗乃香.yml` 备份到 `backup/穗乃香.yml.bak`；写出后校验输出只含一个 `world_lores:` 段且穗乃香条目位于第一。

## 世界书条目编写守则（防止上下文成本失控）

`world_lores` 的行为要点（依据 `附属文件/预设文档.md`）：`constant: true` 条目**每条消息必然全量注入**；`tokenLimit` 只约束关键词扫描；关键词按子串匹配。因此：

- **常驻（constant）条目保持最小集**：目前仅 核心概念 一条（≈4K 字符）。新增设定一律用关键词触发，除非确实每条消息都需要。
- **`recursiveScan` 保持 `false`**：常驻条目内容里罗列了大量角色/地名，开递归会导致每条消息连锁触发角色条目、稳定烧满 tokenLimit。
- **禁止单字关键词**（唯一例外：「渚」）：中文子串匹配下，单字（爱/心/雪/花…）几乎每句话都会误触发。关键词用全名或不易撞车的双字以上组合；英文/称号可以放心用。
- 排查工具：`node scripts/audit_world_book.js` 输出常驻大小、单字关键词、递归风险等指标，改动世界书后可跑一遍。

## 角色例子处理规则

当用户提供新的角色行为/对话例子时，按以下方式处理：

1. **提取关键信息**：从用户描述的场景中提取角色性格特质、行为模式、标志性台词
2. **整合到对应版块**：
   - 性格特质 → `### 性格`
   - 说话方式/语气 → `### 核心对话风格`
   - 具体台词 → `#### 对话示例`（格式：`- 触发场景（动作/情绪）：「台词」`）
   - 行为规则 → `### 重要行为规则`
3. **不保留原始叙述**：不要直接复制用户的场景描述，而是提取为通用的角色设定条目
4. **同步到世界书**：如果例子涉及背景知识（人物关系、世界观等），同步更新 `穗乃香_世界书.yml`
5. **重跑集成**：修改源文件后运行 `node scripts/integrate_preset.js` 重新生成最终预设（自动归档到当天日期文件夹，也可指定日期如 `node scripts/integrate_preset.js 07.18`）
6. **世界书条目修改**：直接编辑 `光之美少女世界书Koishi版.yml`（**不要动酒馆版 JSON**），改后重跑集成

## 文件说明

```
chat/
├── CLAUDE.md                                ← 本指南
├── Scripts/
│   ├── convert_world_book.js                ← 一次性提取工具（重跑会覆盖 Koishi 版手动修改，需 --force）
│   ├── extract_disabled_entries.js          ← 一次性：禁用条目提取（已执行，有防重跑保护）
│   ├── fix_context_cost.js                  ← 一次性：上下文成本治理（已执行）
│   ├── audit_world_book.js                  ← 世界书体检：常驻大小/单字关键词/递归风险
│   └── integrate_preset.js                  ← 拼接预设 + 世界书 → 最终输出（自动按日期归档）
├── 附属文件/                                 ← 源文件与参考资料
│   ├── 世界书/
│   │   ├── 光之美少女世界书酒馆版.json         ← 酒馆格式原文件 — 只读，仅供初次提取，勿修改
│   │   ├── 光之美少女世界书Koishi版.yml        ← 其他角色世界书 — 手动维护，所有修改在此进行
│   │   └── 穗乃香_世界书.yml                  ← 穗乃香世界书条目（背景知识）— 手动编辑
│   ├── 穗乃香_预设/
│   │   └── 穗乃香_预设.yml                    ← 预设源文件（性格、对话、规则）— 手动编辑
│   └── 预设文档.md                            ← ChatLuna 预设格式参考文档
├── 预设/                                     ← 最终输出（按日期归档）
│   ├── 07.16/                               ← 历史版本
│   │   ├── 穗乃香.yml
│   │   └── backup/
│   └── 07.17/                               ← 当前版本（integrate_preset.js 自动创建）
│       ├── 穗乃香.yml
│       └── backup/
└── .Old/                                     ← 历史版本（旧结构，已废弃）
```

## 预设文件格式（ChatLuna）

顶层键为 `keywords`、`prompts`（system 角色，内容是 YAML block scalar 中的 Markdown）、`world_lores`（集成后才有）、`format_user_prompt`。格式细节参考 `附属文件/预设文档.md`。

### 版块结构（穗乃香_预设.yml 的 system prompt 内）

```
### 角色扮演强制规则    ← 防止出戏的 meta 规则（最高优先级）
### 基本个人信息        ← 名字、外貌等事实
### 性格                ← 性格特质
### 秘密身份            ← Cure White 相关
### 核心对话风格        ← 说话方式
    #### 对话示例       ← 具体台词
### 重要行为规则        ← 行为决策
### 输出格式规则        ← koishi 消息格式（message 标签、图片、at 用户）
### 消息拆分与长度
### 表情包
### Character Guidelines
```
