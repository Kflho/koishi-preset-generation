// 临时审计脚本：对照 ChatLuna 预设文档检查世界书格式与上下文风险
const fs = require('fs');
const y = fs.readFileSync('附属文件/世界书/光之美少女世界书Koishi版.yml', 'utf8');
const blocks = y.split(/\n(?=  - keywords:)/);
const entries = blocks.slice(1).map(b => {
  const kwEnd = b.indexOf('    content:');
  const realKeys = [...b.slice(0, kwEnd).matchAll(/^      - (.+)$/gm)].map(m => m[1].replace(/^"|"$/g, ''));
  return {
    b, keys: realKeys,
    constant: /^    constant: true$/m.test(b),
    order: (b.match(/^    order: (\d+)$/m) || [])[1],
    mww: (b.match(/^    matchWholeWord: (\w+)$/m) || [])[1],
    cs: (b.match(/^    caseSensitive: (\w+)$/m) || [])[1],
    size: b.length,
  };
});

console.log('== 1) 常驻条目（constant: true，每条消息必然注入）==');
let cTotal = 0;
for (const e of entries.filter(e => e.constant)) {
  cTotal += e.size;
  console.log('  size=' + (e.size / 1024).toFixed(1) + 'K | keys:', e.keys.slice(0, 4).join('/') || '(无)');
}
console.log('  常驻合计:', (cTotal / 1024).toFixed(1) + 'K 字符 ≈', Math.round(cTotal * 0.7), 'tokens（中文粗估）');

console.log('== 2) 单字关键词（子串匹配下极易误触发）==');
const singles = {};
for (const e of entries) for (const k of e.keys) if ([...k].length === 1) singles[k] = (singles[k] || 0) + 1;
console.log(' ', Object.entries(singles).map(([k, n]) => k + '×' + n).join(' ') || '无');

console.log('== 3) 含正则元字符的关键词（文档：关键词可为正则）==');
const meta = /[.*+?^$()[\]{}|\\]/;
let metaFound = 0;
for (const e of entries) for (const k of e.keys) if (meta.test(k)) { metaFound++; console.log(' ', JSON.stringify(k)); }
if (!metaFound) console.log('  无');

console.log('== 4) matchWholeWord / caseSensitive / order 分布 ==');
console.log('  matchWholeWord=true:', entries.filter(e => e.mww === 'true').length,
  '| =false:', entries.filter(e => e.mww === 'false').length,
  '| 未设置:', entries.filter(e => !e.mww).length);
console.log('  caseSensitive 设置数:', entries.filter(e => e.cs).length,
  '| order 设置数（文档未记载此字段）:', entries.filter(e => e.order).length,
  '值:', [...new Set(entries.filter(e => e.order).map(e => e.order))].join(',') || '-');

console.log('== 5) 递归风险：常驻条目内容可命中多少其他条目的关键词（recursiveScan: true 时）==');
const constContent = entries.filter(e => e.constant).map(e => e.b).join('');
let hit = 0, hitSize = 0;
for (const e of entries.filter(e => !e.constant)) {
  if (e.keys.some(k => k && constContent.includes(k))) { hit++; hitSize += e.size; }
}
console.log('  ' + hit + '/' + entries.filter(e => !e.constant).length,
  '个关键词条目会被常驻内容递归触发，涉及', (hitSize / 1024).toFixed(0) + 'K 字符');

console.log('== 6) 旧版（此前一直在用的 26 条版本）对照 ==');
const old = fs.readFileSync('预设/07.16/backup/穗乃香_集成前备份.yml', 'utf8');
console.log('  旧版 order 行数:', (old.match(/^    order: /gm) || []).length,
  '| 旧版常驻条目数:', (old.match(/^    constant: true$/gm) || []).length,
  '| 旧版 recursiveScan:', (old.match(/recursiveScan: \w+/) || [])[0]);
console.log('  新版 recursiveScan:', (y.match(/recursiveScan: \w+/) || [])[0],
  '| scanDepth:', (y.match(/scanDepth: (\d+)/) || [])[1],
  '| tokenLimit:', (y.match(/tokenLimit: (\d+)/) || [])[1]);
