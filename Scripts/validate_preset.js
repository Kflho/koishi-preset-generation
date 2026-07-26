/**
 * 预设文件格式校验脚本
 * 对照 ChatLuna 预设文档逐项检查生成的预设是否符合规范
 * 用法: node scripts/validate_preset.js [日期|路径]
 *   不带参数 → 校验今天的 预设/<MM.DD>/穗乃香.yml
 *   带日期   → 校验 预设/<MM.DD>/穗乃香.yml
 *   带路径   → 校验指定 .yml 文件
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Parse arg
const arg = process.argv[2];
let targetPath;
if (arg && arg.endsWith('.yml')) {
  targetPath = path.resolve(arg);
} else if (arg && /^\d{2}\.\d{2}$/.test(arg)) {
  targetPath = path.join(root, '预设', arg, '穗乃香.yml');
} else {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  targetPath = path.join(root, '预设', pad(d.getMonth() + 1) + '.' + pad(d.getDate()), '穗乃香.yml');
}

console.log('校验目标: ' + targetPath + '\n');
if (!fs.existsSync(targetPath)) {
  console.error('错误: 文件不存在');
  process.exit(1);
}

const raw = fs.readFileSync(targetPath, 'utf8');
const lines = raw.split('\n');
const errors = [];
const warnings = [];

const kb = s => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1);

// ===== 1. YAML 基本结构 =====
console.log('=== 1. YAML 基本结构 ===');

// Tab check
const tabLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('\t')) tabLines.push(i + 1);
}
if (tabLines.length > 0) errors.push('发现 Tab 缩进: 行 ' + tabLines.slice(0, 5).join(', '));

// Top-level keys
const topKeys = [];
for (const line of lines) {
  const m = line.match(/^([a-zA-Z_]\w*):/);
  if (m && !topKeys.includes(m[1])) topKeys.push(m[1]);
}
for (const k of ['keywords', 'prompts']) {
  if (!topKeys.includes(k)) errors.push('缺少顶层必需 key: ' + k);
}
console.log('  顶层 keys: ' + topKeys.join(', '));

const ALLOWED_TOP = ['keywords', 'prompts', 'world_lores', 'format_user_prompt', 'authors_note', 'config'];
for (const k of topKeys) {
  if (!ALLOWED_TOP.includes(k)) warnings.push('未知顶层 key: ' + k);
}

// ===== 2. keywords 段 =====
console.log('=== 2. keywords 段 ===');

const kwTop = lines.findIndex(l => /^keywords:/.test(l));
const nextTopAfterKw = lines.findIndex((l, i) => i > kwTop && /^[a-zA-Z_]\w*:/.test(l));
const kwEnd = nextTopAfterKw >= 0 ? nextTopAfterKw : lines.length;

const presetKeywords = [];
for (let i = kwTop + 1; i < kwEnd; i++) {
  const m = lines[i].match(/^\s+-\s+(.+)/);
  if (m && !lines[i].includes('keywords:')) presetKeywords.push(m[1].trim());
}
if (presetKeywords.length === 0) {
  errors.push('keywords 段为空');
} else {
  console.log('  关键词: ' + presetKeywords.join(', '));
}
presetKeywords.filter(k => !k).forEach(() => errors.push('keywords 存在空值'));

// ===== 3. prompts 段 =====
console.log('=== 3. prompts 段 ===');

const pTop = lines.findIndex(l => /^prompts:/.test(l));
const pEnd = lines.findIndex((l, i) => i > pTop && /^[a-zA-Z_]\w*:/.test(l));
const pSectionEnd = pEnd >= 0 ? pEnd : lines.length;

const prompts = [];
let cur = null;
for (let i = pTop + 1; i < pSectionEnd; i++) {
  const line = lines[i];
  const rm = line.match(/^\s+-\s+role:\s*(.+)/);
  if (rm) {
    if (cur) prompts.push(cur);
    cur = { role: rm[1].trim(), line: i + 1, contentLine: -1, blockScalar: false, hasContent: false };
    continue;
  }
  if (cur && /^\s+content:/.test(line)) {
    cur.contentLine = i + 1;
    cur.hasContent = true;
    if (/\|-/.test(line) || /\|[^-]/.test(line) && !/\|$/.test(line)) cur.blockScalar = true;
  }
}
if (cur) prompts.push(cur);

console.log('  消息条目: ' + prompts.length);
if (prompts.length === 0) errors.push('prompts 段为空');

prompts.forEach((e, i) => {
  if (!['system', 'user', 'assistant'].includes(e.role)) {
    errors.push('prompts[' + i + '] role="' + e.role + '" 无效');
  }
  if (!e.hasContent) {
    errors.push('prompts[' + i + '] 缺少 content (行 ' + e.line + ')');
  }
});
if (!prompts.some(e => e.role === 'system')) errors.push('prompts 缺少 system 消息');
if (prompts.length > 0 && prompts[0].role !== 'system') warnings.push('prompts[0] 建议为 system');

// ===== 4. world_lores 段 =====
console.log('=== 4. world_lores 段 ===');

const wlTop = lines.findIndex(l => /^world_lores:/.test(l));
if (wlTop < 0) {
  console.log('  无 world_lores 段');
} else {
  const wlEnd = (() => {
    for (let i = wlTop + 1; i < lines.length; i++) {
      if (/^[a-zA-Z_]\w*:/.test(lines[i])) return i;
    }
    return lines.length;
  })();

  // Parse entries: each starts with "  - " at indent 2
  const entries = [];
  let entry = null;
  let inContent = false;

  for (let i = wlTop + 1; i < wlEnd; i++) {
    const line = lines[i];

    // Detect start of a new world_lore list item
    // Config entry: "  - scanDepth:" etc (no "keywords" key)
    // Data entry: "  - keywords:"
    if (/^  - keywords:/.test(line)) {
      if (entry) entries.push(entry);
      entry = { line: i + 1, keywords: [], contentLine: -1, blockScalar: false, constant: false };
      inContent = false;
      continue;
    }

    if (!entry) continue; // still in config block or before first entry

    // Keyword line: "      - xxx"
    if (/^\s{6}-\s+(.+)/.test(line) && !/content:/.test(line) && !inContent) {
      const kw = line.match(/^\s{6}-\s+(.+)/)[1].trim();
      if (kw.length > 0) entry.keywords.push(kw);
      continue;
    }

    // Content start: "    content: |-"
    if (/^\s{4}content:/.test(line)) {
      entry.contentLine = i + 1;
      if (/\|-/.test(line)) entry.blockScalar = true;
      inContent = true;
      continue;
    }

    // constant check (inside entry, before next entry)
    if (/constant:\s*true/.test(line)) entry.constant = true;
  }
  if (entry) entries.push(entry);

  // ---- Config check ----
  // Find config block: the lines between world_lores: and first "  - keywords:"
  const firstKwLine = (() => {
    for (let i = wlTop + 1; i < wlEnd; i++) {
      if (/^  - keywords:/.test(lines[i])) return i;
    }
    return -1;
  })();
  const configStart = wlTop + 1;
  const configEnd = firstKwLine >= 0 ? firstKwLine : wlEnd;

  const configKeys = [];
  for (let i = configStart; i < configEnd; i++) {
    // Matches "  - scanDepth: 2" and "    tokenLimit: 2000"
    const m = lines[i].match(/^\s{2,4}-?\s*(\w+):/);
    if (m && !['keywords', 'content'].includes(m[1])) configKeys.push(m[1]);
  }

  const REQUIRED_CONFIG = ['scanDepth', 'tokenLimit', 'recursiveScan', 'maxRecursionDepth'];
  for (const k of REQUIRED_CONFIG) {
    if (!configKeys.includes(k)) errors.push('world_lores 默认配置缺少: ' + k);
  }
  console.log('  默认配置: ' + configKeys.join(', '));

  // ---- Entry checks ----
  console.log('  条目数量: ' + entries.length);

  const constantEntries = [];
  const allKw = new Map(); // lowerKw → [entryIndices]

  entries.forEach((e, i) => {
    if (e.keywords.length === 0) {
      errors.push('条目[' + i + '] 行' + e.line + ': 无关键词');
    }
    e.keywords.forEach((kw, j) => {
      if (!kw) {
        errors.push('条目[' + i + '] 关键词[' + j + '] 为空');
        return;
      }
      if (kw.length === 1 && kw !== '渚') {
        warnings.push('条目[' + i + '] 行' + e.line + ': 单字关键词 "' + kw + '" (误触发风险)');
      }
      const lower = kw.toLowerCase();
      if (!allKw.has(lower)) allKw.set(lower, []);
      allKw.get(lower).push(i);
    });
    if (!e.blockScalar) {
      warnings.push('条目[' + i + '] 行' + e.contentLine + ': content 未使用 |- 块标量');
    }
    if (e.constant) constantEntries.push(i);
  });

  console.log('  constant:true: ' + (constantEntries.length || 0) + (constantEntries.length > 0 ? ' ⚠️ [' + constantEntries.join(',') + ']' : ' ✓'));

  // Duplicate keywords (real ones, not artifact)
  const dupes = [...allKw.entries()].filter(([, v]) => v.length > 1);
  // Filter: only report if it's a meaningful duplicate (not just lowercase English variants)
  const significantDupes = dupes.filter(([kw]) => kw.length >= 2 && !/^[a-z]{1,3}$/i.test(kw));
  if (significantDupes.length > 0) {
    console.log('  重复关键词:');
    significantDupes.forEach(([kw, indices]) => {
      console.log('    "' + kw + '" → 条目 [' + indices.join(', ') + ']');
    });
    if (significantDupes.length > 10) {
      warnings.push('存在 ' + significantDupes.length + ' 组重复关键词');
    }
  } else {
    console.log('  重复关键词: 0 ✓');
  }

  // ===== 5. Entry content 高危格式检查 =====
  console.log('=== 5. 高危格式扫描 ===');

  // 5a. Unindented # comments
  const badComments = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#(?!\!)/.test(lines[i])) badComments.push(i + 1);
  }
  if (badComments.length > 0) {
    errors.push('行首 # 注释 (会破坏 YAML): ' + badComments.join(', '));
  } else {
    console.log('  行首注释: 0 ✓');
  }

  // 5b. content:|- followed by non-indented line
  for (let i = 0; i < lines.length; i++) {
    if (/^\s+content:\s*\|/.test(lines[i])) {
      const indent = lines[i].match(/^(\s+)/)[1].length;
      let next = i + 1;
      while (next < lines.length && lines[next].trim() === '') next++;
      if (next < lines.length) {
        const nextLine = lines[next];
        const nextIndent = nextLine.match(/^(\s*)/)[1].length;
        // Top-level key or unindented comment following content block — fatal
        if (/^[a-zA-Z_]\w*:/.test(nextLine) || /^#/.test(nextLine)) {
          errors.push('行' + (i + 1) + ' content:|- 后紧跟非缩进行' + (next + 1) + ': ' + nextLine.substring(0, 50));
        }
      }
    }
  }
  console.log('  content:|- 结构: OK');

  // 5c. Multiple world_lores
  const wlMulti = (raw.match(/^world_lores:/gm) || []).length;
  if (wlMulti > 1) errors.push(wlMulti + ' 个 world_lores 段 (应 1 个)');
  console.log('  world_lores 段数: ' + wlMulti + (wlMulti === 1 ? ' ✓' : ' ⚠️'));

  // 5d. Empty blocks: entry with keywords but no content
  entries.forEach((e, i) => {
    if (e.keywords.length > 0 && !e.blockScalar && !e.hasContent) {
      errors.push('条目[' + i + '] 行' + e.line + ': 有关键词但无 content');
    }
  });
}
// ===== 结果 =====
console.log('\n========================================');
console.log('           校 验 结 果');
console.log('========================================');

const bytes = Buffer.byteLength(raw, 'utf8');
console.log('文件大小: ' + kb(raw) + ' KB (' + raw.length.toLocaleString() + ' 字符, ' + bytes.toLocaleString() + ' 字节)');

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ 全部通过！预设格式符合 ChatLuna 规范。');
} else {
  if (errors.length > 0) {
    console.log('\n❌ 错误 (' + errors.length + ') — 必须修复:');
    errors.forEach((e, i) => console.log('  ' + (i + 1) + '. ' + e));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  警告 (' + warnings.length + ') — 建议检查:');
    warnings.forEach((w, i) => console.log('  ' + (i + 1) + '. ' + w));
  }
}

console.log('\n规范: 附属文件/预设文档.md + CLAUDE.md §世界书条目编写守则');
process.exit(errors.length > 0 ? 1 : 0);
