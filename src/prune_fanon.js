// 一次性清理脚本 v2（2026-07-16）：按用户决定移除作者私设框架
// A1: 全部 psychological_analysis 段（心之钻石/法则分析框架）
// A2: 世界观构建 5 条整条删除  A3: 作者评述句  B5: 普卡  B6: 开局-和平
// v2: 改用关键词签名精确定位待删条目（v1 用内容子串误删了蕾吉娜/咲良歌）
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../bin/requirements/世界书/光之美少女世界书Koishi版.yml');
let y = fs.readFileSync(p, 'utf8');
fs.copyFileSync(p, p + '.bak');

let blocks = y.split(/\n(?=  - keywords:)/);
const before = blocks.length - 1;
const sig = b => [...b.slice(0, b.indexOf('    content:')).matchAll(/^      - (.+)$/gm)].map(m => m[1]).join('/');

// ---- A2 + B5 + B6：按关键词签名整条删除 ----
const DROP = [
  ['世界观/人类/角色/绝望/希望', '基础法则'],
  ['概况/势力/黑暗/世界观', '世界概况'],
  ['世界观/地理/区域/舞台/地区', '地理划分'],
  ['反派/组织/干部/敌人/敌对势力', '反派组织'],
  ['暗之力', '暗之力'],
  ['""', '开局-和平'],
  ['普卡/普卡天使/普利姆/普里姆', '普卡'],
];
for (const [s, name] of DROP) {
  const idx = blocks.findIndex((b, i) => i > 0 && sig(b) === s);
  if (idx === -1) { console.error('未找到:', name, '(签名:', s + ')'); process.exit(1); }
  console.log('删除条目:', name, '| ' + (blocks[idx].length / 1024).toFixed(1) + 'K | 签名:', sig(blocks[idx]));
  blocks.splice(idx, 1);
}

// ---- A1：删除全部 psychological_analysis 段 ----
let psyN = 0, psySize = 0;
blocks = blocks.map((b, i) => {
  if (i === 0) return b;
  return b.replace(/\n\s*psychological_analysis:[\s\S]*?(?=\n\s+(combat_profile|relational_database|chronological_record|appearance))/g,
    m => { psyN++; psySize += m.length; return ''; });
});
console.log('A1 psychological_analysis 段: 删除', psyN, '处,共', (psySize / 1024).toFixed(1) + 'K');
console.log('psychological_analysis 残留:', (blocks.join('\n').match(/psychological_analysis/g) || []).length);

// ---- A3：作者评述句（整行纯评述删行，句中夹带删句）----
const PAT = /鼻祖|开创者|最高典范|奠基人|正剧史上|历代.{0,8}典范/;
const kept = [];
let a3 = 0;
for (const line of blocks.join('\n').split('\n')) {
  if (PAT.test(line)) {
    const sentences = line.split(/(?<=[。！])/);
    const clean = sentences.filter(s => !PAT.test(s)).join('');
    if (clean.replace(/[\s"'\->|]/g, '').length > 0) {
      console.log('A3 删句:', sentences.filter(s => PAT.test(s)).join('').trim().slice(0, 60));
      kept.push(clean);
    } else console.log('A3 删行:', line.trim().slice(0, 60));
    a3++;
  } else kept.push(line);
}
console.log('A3 处理行数:', a3);
fs.writeFileSync(p, kept.join('\n'), 'utf8');

// ---- 校验 ----
const out = fs.readFileSync(p, 'utf8');
const n = (out.match(/^  - keywords:/gm) || []).length;
let cN = 0, cSize = 0;
for (const b of out.split(/\n(?=  - keywords:)/)) if (/^    constant: true$/m.test(b)) { cN++; cSize += b.length; }
console.log('---');
console.log('条目数:', before, '->', n, '| 常驻:', cN, '条 /', (cSize / 1024).toFixed(1) + 'K');
console.log('文件大小:', (out.length / 1024).toFixed(1) + 'K 字符');
console.log('误删检查 蕾吉娜:', out.includes('蕾吉娜'), '| 咲良歌:', out.includes('咲良歌'), '| 月影百合:', out.includes('月影百合'));
console.log('心之钻石残留:', (out.match(/心之钻石/g) || []).length, '| 评述词残留:', (out.match(PAT) || []).length);
// 残留的已删框架引用（暗影协议/命运神战），供后续人工判断
for (const w of ['暗影协议', '命运神战', '心之力富集']) {
  const hits = out.split('\n').map((l, i) => PAT2(l, w) ? i + 1 : 0).filter(Boolean);
  function PAT2(l, w) { return l.includes(w); }
  if (hits.length) console.log('框架残留引用「' + w + '」行号:', hits.join(','));
}
