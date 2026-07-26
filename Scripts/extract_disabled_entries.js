// 一次性迁移脚本（2026-07-16）：把酒馆版 JSON 中的禁用条目提取并追加到 Koishi 版 YAML。
// 酒馆版 JSON 为只读原文件，本脚本只读取它，所有写入落在 Koishi 版。
// 处理原则（用户确认）：
//   - 普通/满级（及剧情阶段）双版本 → 只取满级/最终形态，关键词取两版并集
//   - 私设/原设冲突 → 原设优先；私设独有角色（普卡）照常提取
//   - 跳过 {{user}} 人设条目与空条目
//   - 已手动加入 Koishi 版的犬饲小麦/犬饲彩羽（uid 54/56）不重复提取
//   - 雪城穗乃香（uid 153/154）不提取：与手动维护的 穗乃香_世界书.yml 条目重复，
//     其中 Max Heart 知识已归并为该条目的「第二部_Max_Heart_未来知识」版块
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const jsonPath = path.join(root, '附属文件/世界书/光之美少女世界书酒馆版.json');
const koishiPath = path.join(root, '附属文件/世界书/光之美少女世界书Koishi版.yml');

// 防重跑：本脚本已于 2026-07-16 执行过（以已注入的条目为标记）
if (fs.readFileSync(koishiPath, 'utf8').includes('character_id: "ST-03"')) {
  console.error('⚠️  检测到禁用条目已提取过（Koishi 版中已存在 ST-03 等条目），拒绝重复执行。');
  process.exit(1);
}

// 跳过：私设(6,87)、{{user}}(29,33,202)、空条目(208)、已手动提取(54,56)、穗乃香(153,154)
const SKIP = new Set([6, 87, 29, 33, 202, 208, 54, 56, 153, 154]);

// [基础版 uid, 满级/最终形态 uid] —— 取后者内容，关键词并集
const PAIRS = [
  [24, 23], [26, 25], [62, 61], [64, 63], [66, 65], [68, 67], [82, 83],
  [84, 85], [88, 89], [90, 91], [92, 100], [93, 94], [95, 96], [97, 98],
  [99, 101], [104, 105], [106, 107], [108, 109], [110, 111], [112, 113],
  [114, 115], [116, 117], [118, 119], [120, 121], [122, 123], [124, 125],
  [127, 128], [129, 132], [130, 133], [131, 134], [135, 136], [137, 138],
  [139, 140], [141, 142], [143, 144], [145, 148], [146, 149], [147, 150],
  [151, 152], [155, 156], [157, 158], [159, 160], [161, 162],
  [163, 164], [165, 166], [167, 32], [169, 170], [171, 172], [173, 176],
  [174, 177], [175, 178], [179, 180], [181, 182], [183, 186], [184, 187],
  [185, 188], [189, 190], [191, 195], [192, 196], [193, 197], [194, 198],
];

const src = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const byUid = {};
for (const e of Object.values(src.entries)) byUid[e.uid] = e;

const disabled = Object.values(src.entries).filter(e => e.disable);

// --- 完整性核对：每个禁用条目必须被 恰好一种方式 处理 ---
const covered = new Set([...SKIP]);
for (const [a, b] of PAIRS) { covered.add(a); covered.add(b); }
const pairedUids = new Set(PAIRS.flat());
const singles = disabled.filter(e => !SKIP.has(e.uid) && !pairedUids.has(e.uid));
for (const e of singles) covered.add(e.uid);
const missed = disabled.filter(e => !covered.has(e.uid));
if (missed.length) { console.error('未覆盖的禁用条目:', missed.map(e => e.uid)); process.exit(1); }

// --- 配对校验：两版应属同一角色（character_id 一致） ---
const idOf = e => (e.content.match(/character_id:\s*"([^"]+)"/i) || [])[1] || null;
for (const [a, b] of PAIRS) {
  const ia = idOf(byUid[a]), ib = idOf(byUid[b]);
  if (ia && ib && ia !== ib) console.log(`  [WARN] 配对 ${a}/${b} character_id 不一致: ${ia} vs ${ib}`);
}

// --- 与 convert_world_book.js 相同的 YAML 生成逻辑 ---
function yamlBlockScalar(text) {
  return '|-\n' + text.split('\n').map(l => '      ' + l).join('\n');
}
function yamlStr(s) {
  if (/[:\{\}\[\],&*?|><=!%@`#'"]/.test(s) || s.includes('\n') || s === '') return JSON.stringify(s);
  return s;
}
function getEffectiveKeywords(entry) {
  const primary = entry.key ?? [];
  const secondary = entry.keysecondary ?? [];
  if (entry.selective && secondary.length > 0) {
    console.log(`  [WARN] "${entry.comment}" selective=true，丢弃次要键: ${JSON.stringify(secondary)}`);
  }
  return entry.selective ? primary : [...primary, ...secondary];
}
function writeLoreEntry(entry, allKeys) {
  let out = '  - keywords:\n';
  if (allKeys.length > 0) for (const k of allKeys) out += `      - ${yamlStr(k)}\n`;
  else out += '      - ""\n';
  out += `    content: ${yamlBlockScalar(entry.content)}\n`;
  if (entry.constant) out += '    constant: true\n';
  if (entry.order != null && entry.order !== 100) out += `    order: ${entry.order}\n`;
  if (entry.scanDepth !== null) out += `    scanDepth: ${entry.scanDepth}\n`;
  if (entry.caseSensitive !== null) out += `    caseSensitive: ${entry.caseSensitive}\n`;
  if (entry.matchWholeWords !== null) out += `    matchWholeWord: ${entry.matchWholeWords}\n`;
  return out;
}

// --- 生成新条目（uid 升序），关键词并集：最终形态在前，基础版补充在后 ---
const items = []; // {uid, entry, keys}
for (const [a, b] of PAIRS) {
  const keys = [...new Set([...getEffectiveKeywords(byUid[b]), ...getEffectiveKeywords(byUid[a])])];
  items.push({ uid: b, entry: byUid[b], keys });
}
for (const e of singles) items.push({ uid: e.uid, entry: e, keys: getEffectiveKeywords(e) });
items.sort((x, y) => x.uid - y.uid);

let newKeyword = '', newConstant = '';
for (const it of items) {
  const block = writeLoreEntry(it.entry, it.keys) + '\n';
  if (it.entry.constant) newConstant += block; else newKeyword += block;
}

// --- 插入 Koishi 版：关键词条目插在首个常驻条目前，常驻条目追加到末尾 ---
let koishi = fs.readFileSync(koishiPath, 'utf8');
fs.copyFileSync(koishiPath, koishiPath + '.bak');
console.log('备份: ' + koishiPath + '.bak');

const blocks = koishi.split(/\n(?=  - keywords:)/);
const firstConstIdx = blocks.findIndex(b => /^    constant: true$/m.test(b));
if (firstConstIdx === -1) { console.error('未找到常驻条目块'); process.exit(1); }
blocks.splice(firstConstIdx, 0, newKeyword.trimEnd() + '\n');
blocks.push(newConstant.trimEnd() + '\n');
const out = blocks.join('\n');
fs.writeFileSync(koishiPath, out, 'utf8');

const total = (out.match(/^  - keywords:/gm) || []).length;
console.log(`新增: ${items.length} 条（关键词触发 ${items.filter(i => !i.entry.constant).length}，常驻 ${items.filter(i => i.entry.constant).length}）`);
console.log(`合并双版本: ${PAIRS.length} 对 | 独立条目: ${singles.length} | 跳过: ${SKIP.size}`);
console.log(`Koishi 版条目总数: ${total} | 文件大小: ${(out.length / 1024).toFixed(1)}K 字符`);
