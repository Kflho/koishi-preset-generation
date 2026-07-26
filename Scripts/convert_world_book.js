const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// ⚠️ 一次性提取工具：从酒馆版 JSON（只读原文件）提取生成 Koishi 版 YAML。
// Koishi 版 YAML 是手动维护的主文件——重跑本脚本会覆盖其中所有手动修改！
// 确需重新提取时，先备份 Koishi 版，再加 --force 参数运行。
if (!process.argv.includes('--force')) {
  console.error('⚠️  光之美少女世界书Koishi版.yml 是手动维护的主文件，重跑会覆盖手动修改。');
  console.error('   确认要从酒馆版 JSON 重新提取，请运行: node scripts/convert_world_book.js --force');
  process.exit(1);
}

// Read source world book
const source = JSON.parse(
  fs.readFileSync(
    path.join(root, '附属文件/世界书/光之美少女世界书酒馆版.json'),
    'utf8'
  )
);

const entries = Object.values(source.entries);

// Filter: only enabled entries
const enabled = entries.filter(e => !e.disable);

console.log(`Total: ${entries.length}, Enabled: ${enabled.length}`);

// Separate constant (always-insert) vs keyword-triggered
const constantEntries = enabled.filter(e => e.constant);
const keywordEntries = enabled.filter(e => !e.constant);

console.log(`Constant: ${constantEntries.length}, Keyword-triggered: ${keywordEntries.length}`);

// --- Build YAML ---
let yaml = '';

// Helper: YAML string with proper escaping for content blocks
function yamlBlockScalar(text) {
  // Use |- (literal block scalar, strip trailing newlines)
  // Indent by 6 spaces (under 'content: ')
  const lines = text.split('\n');
  return '|-\n' + lines.map(l => '      ' + l).join('\n');
}

// Helper: escape a single string value for YAML
function yamlStr(s) {
  // If it contains special chars, wrap in quotes
  if (/[:\{\}\[\],&*?|><=!%@`#'"]/.test(s) || s.includes('\n') || s === '') {
    return JSON.stringify(s);
  }
  return s;
}

// Default config (first entry, no keywords)
yaml += 'world_lores:\n';
yaml += '  - scanDepth: 2\n';
yaml += '    tokenLimit: 2000\n';
yaml += '    recursiveScan: true\n';
yaml += '    maxRecursionDepth: 3\n';
yaml += '\n';

/**
 * Determine which keywords to use for ChatLuna matching.
 *
 * 酒馆 (SillyTavern) lorebook logic:
 *   - selective=true  → only `key` (primary) triggers; `keysecondary` is ignored for matching
 *   - selective=false → any of `key` + `keysecondary` triggers (OR logic)
 *
 * ChatLuna uses OR logic (any keyword matches), but we should NOT include
 * keysecondary when selective=true because those secondary keys were never
 * intended to trigger the entry in the original 酒馆 config.
 */
function getEffectiveKeywords(entry) {
  const primary = entry.key ?? [];
  const secondary = entry.keysecondary ?? [];

  // selective=true: only primary keys matter for matching
  // selective=false or undefined: primary + secondary both trigger
  if (entry.selective && secondary.length > 0) {
    console.log(`  [WARN] Entry "${entry.comment}" has selective=true with keysecondary, ` +
                `dropping secondary keys: ${JSON.stringify(secondary)}`);
  }

  return entry.selective ? primary : [...primary, ...secondary];
}

// Write a single lore book entry
function writeLoreEntry(entry, allKeys) {
  let out = '';

  out += '  - keywords:\n';
  if (allKeys.length > 0) {
    for (const k of allKeys) {
      out += `      - ${yamlStr(k)}\n`;
    }
  } else {
    // Empty keywords but constant — still need the keywords field for YAML structure
    out += '      - ""\n';
  }

  out += `    content: ${yamlBlockScalar(entry.content)}\n`;

  if (entry.constant) {
    out += '    constant: true\n';
  }
  if (entry.order != null && entry.order !== 100) {
    out += `    order: ${entry.order}\n`;
  }
  if (entry.scanDepth !== null) {
    out += `    scanDepth: ${entry.scanDepth}\n`;
  }
  if (entry.caseSensitive !== null) {
    out += `    caseSensitive: ${entry.caseSensitive}\n`;
  }
  if (entry.matchWholeWords !== null) {
    out += `    matchWholeWord: ${entry.matchWholeWords}\n`;
  }

  return out;
}

// Process keyword-triggered entries first
for (const entry of keywordEntries) {
  const allKeys = getEffectiveKeywords(entry);
  yaml += writeLoreEntry(entry, allKeys);
  yaml += '\n';
}

// Process constant entries
for (const entry of constantEntries) {
  const allKeys = getEffectiveKeywords(entry);
  yaml += writeLoreEntry(entry, allKeys);
  yaml += '\n';
}

// Write output
const outPath = path.join(root, '附属文件/世界书/光之美少女世界书Koishi版.yml');
fs.writeFileSync(outPath, yaml, 'utf8');
console.log(`Written to: ${outPath}`);
console.log(`Output size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
