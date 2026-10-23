// 一次性修复脚本（2026-07-16）：上下文成本治理
// 1) recursiveScan: true → false（切断常驻内容对角色条目的递归连锁触发）
// 2) 常驻瘦身：仅保留 开局/基础法则/核心概念(小) 常驻（≈7K 字符）；
//    地理划分、反派组织、世界概况、核心概念详细版、暗之力 降级为关键词触发
// 3) 角色条目单字关键词 → 全名（保留「渚」）
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../bin/requirements/世界书/光之美少女世界书Koishi版.yml');
let y = fs.readFileSync(p, 'utf8');
fs.copyFileSync(p, p + '.bak');

// --- 1) 递归扫描关闭 ---
if (!y.includes('recursiveScan: true')) { console.error('未找到 recursiveScan: true'); process.exit(1); }
y = y.replace('recursiveScan: true', 'recursiveScan: false');

const blocks = y.split(/\n(?=  - keywords:)/);
const keysOf = b => [...b.slice(0, b.indexOf('    content:')).matchAll(/^      - (.+)$/gm)].map(m => m[1].replace(/^"|"$/g, ''));
const findBlock = marker => {
  const i = blocks.findIndex(b => keysOf(b).includes(marker));
  if (i === -1) { console.error('未找到关键词含 ' + marker + ' 的条目'); process.exit(1); }
  return i;
};
const setKeys = (i, keys) => {
  blocks[i] = '  - keywords:\n' + keys.map(k => '      - ' + k + '\n').join('') + blocks[i].slice(blocks[i].indexOf('    content:'));
};
const dropConstant = i => {
  if (!/^    constant: true\n/m.test(blocks[i])) { console.error('块 ' + i + ' 没有 constant 标记'); process.exit(1); }
  blocks[i] = blocks[i].replace(/^    constant: true\n/m, '');
};

// --- 2) 常驻降级 + 换触发词 ---
let i = findBlock('划分');            // 世界观构建 - 地理划分
setKeys(i, ['世界观', '地理', '区域', '舞台', '地区']); dropConstant(i);
i = findBlock('地域');                // 世界观构建 - 反派组织
setKeys(i, ['反派', '组织', '干部', '敌人', '敌对势力']); dropConstant(i);
i = findBlock('概况');                // 世界观构建 - 世界概况
setKeys(i, ['概况', '势力', '黑暗', '世界观']); dropConstant(i);
i = findBlock('光美');                // 核心概念 - 详细版（keys 保留，仅取消常驻）
dropConstant(i);
i = findBlock('暗之力');              // 世界观构建 - 暗之力
dropConstant(i);

// --- 3) 单字关键词 → 全名（保留「渚」）---
const MAP = {
  遥: '春野遥', 花: '野乃花', 南: '海藤南', 誉: '辉木誉', 圣: '圣扬羽',
  蕾: '花咲蕾', 树: '明堂院树', 悟: '兔山悟', 雪: '猫屋敷雪', 惠: '爱乃惠',
  歌: '咲良歌', 心: '紫雨心', 缘: '琴爪缘', 晶: '剑城晶', 幸: '星空幸',
  茜: '日野茜', 直: '绿川直', 响: '北条响', 奏: '南野奏', 咲: '日向咲',
  结: '和实结', 兰: '华满兰', 望: '梦原望', 丽: '春日野丽', 玲: '夏木玲',
  圆: '香九矢圆', 实: '一之濑实', 拉: '萝拉',
};
let replaced = 0;
for (let j = 1; j < blocks.length; j++) {
  const keys = keysOf(blocks[j]);
  if (!keys.length) continue;
  const out = [];
  let changed = false;
  for (const k of keys) {
    if ([...k].length === 1 && k !== '渚' && k !== '"' && k !== '') {
      let full = MAP[k];
      if (k === '爱') full = keys.includes('相田') ? '相田爱' : keys.includes('桃园') ? '桃园爱' : null;
      if (!full) { console.log('  [WARN] 未映射的单字关键词:', k, '| 所在条目 keys:', keys.join('/')); out.push(k); continue; }
      if (!out.includes(full) && !keys.includes(full)) out.push(full);
      changed = true; replaced++;
    } else if (!out.includes(k)) out.push(k);
  }
  if (keys.includes('猫屋敷') && !out.includes('小雪')) { out.push('小雪'); changed = true; }
  if (changed) setKeys(j, out);
}

fs.writeFileSync(p, blocks.join('\n'), 'utf8');

// --- 校验 ---
const out = fs.readFileSync(p, 'utf8');
const consts = (out.match(/^    constant: true$/gm) || []).length;
let cSize = 0;
for (const b of out.split(/\n(?=  - keywords:)/)) if (/^    constant: true$/m.test(b)) cSize += b.length;
const singleLeft = new Set();
for (const b of out.split(/\n(?=  - keywords:)/).slice(1)) for (const k of keysOf(b)) if ([...k].length === 1) singleLeft.add(k);
console.log('recursiveScan:', (out.match(/recursiveScan: (\w+)/) || [])[1]);
console.log('常驻条目数:', consts, '| 常驻总大小:', (cSize / 1024).toFixed(1) + 'K 字符');
console.log('替换的单字关键词:', replaced, '| 残留单字:', [...singleLeft].join(' ') || '无');
console.log('条目总数:', (out.match(/^  - keywords:/gm) || []).length);
