/**
 * 世界书精简脚本
 * 1. 修复高危日常关键词（未来/日向/小雪/blue等→全名）
 * 2. 从角色条目中移除城市关键词，改为城市摘要条目
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'bin', 'requirements', '世界书', '光之美少女世界书Koishi版.yml');

// ─── 高危关键词修复表 ───
// { targetEntryKeyword: { old: '要删除的短关键词', new: '替换为的全名' } }
// 用条目标识关键词定位条目，然后移除短关键词
const RISKY_FIXES = [
  // { matchKW: 定位条目的关键词, remove: 要删除的短关键词 }
  { matchKW: '朝日奈', remove: '未来' },
  { matchKW: '小林', remove: '未来' },           // 注意：匹配条目后移除裸"未来"
  { matchKW: '平光日向', remove: '日向' },
  { matchKW: '日向咲', remove: '日向' },
  { matchKW: '猫屋敷', remove: '小雪' },          // Entry 38, 39 都含猫屋敷
  { matchKW: '蔚蓝', remove: 'blue' },
  { matchKW: '宇佐美一花', remove: '一花' },
  { matchKW: '有栖川向阳', remove: '向阳' },
  { matchKW: '夏海', remove: '真夏' },            // 注意：需要匹配夏海真夏条目
  { matchKW: '凉村珊瑚', remove: '珊瑚' },
  { matchKW: '芙羽心音', remove: '心音' },
  { matchKW: '红城', remove: '永久' },
];

// ─── 城市组定义 ───
// { city: '城市名', members: ['角色名(Cure名)', ...] }
const CITY_GROUPS = [
  {
    city: '天空市',
    members: [
      '索拉 (Cure Sky / 天空天使)',
      '虹之丘真白 (Cure Prism / 棱镜天使)',
      '圣扬羽 (Cure Butterfly / 蝴蝶天使)',
      '夕凪翼 (Cure Wing / 羽翼天使)',
      '艾尔 (Cure Majesty / 庄严天使)',
    ],
  },
  {
    city: '动物小镇',
    members: [
      '犬饲小麦 (Cure Wonderful / 精彩天使)',
      '犬饲彩叶 (Cure Friendy / 友爱天使)',
      '兔山悟',
      '大福',
    ],
  },
  {
    city: '大贝市',
    members: [
      '相田爱 (Cure Heart / 心天使)',
      '菱川六花 (Cure Diamond / 钻石头天使)',
      '剑崎真琴 (Cure Sword / 剑天使)',
    ],
  },
  {
    city: '希望花市',
    members: [
      '花咲蕾 (Cure Blossom / 花蕾天使)',
      '来海绘里香 (Cure Marine / 海天使)',
      '明堂院树 (Cure Sunshine / 阳光天使)',
      '月影百合 (Cure Moonlight / 月光天使)',
    ],
  },
  {
    city: '光之丘',
    members: [
      '爱乃惠 (Cure Lovely / 可爱天使)',
      '白雪姬 (Cure Princess / 公主天使)',
      '大森悠子 (Cure Honey / 蜜糖天使)',
      '冰川伊奈绪 (Cure Fortune / 命运天使)',
    ],
  },
  {
    city: '津成木',
    members: [
      '朝日奈未来 (Cure Miracle / 奇迹天使)',
      '十六夜理子 (Cure Magical / 魔法天使)',
      '花海言叶 (Cure Felice / 幸福天使)',
    ],
  },
  {
    city: '花道镇',
    members: [
      '咲良歌 (Cure Idol / 偶像天使)',
      '苍风奈奈 (Cure Wink / 眨眼天使)',
      '紫雨心 (Cure Kyun-Kyun / 心动天使)',
      '普莉莉珂 (Cure Precious / 珍贵天使)',
      '田中玫珑',
    ],
  },
  {
    city: '草莓坂中学',
    members: [
      '宇佐美一花 (Cure Whip / 奶油天使)',
      '有栖川向阳 (Cure Custard / 布丁天使)',
      '立神葵 (Cure Gelato / 冰淇淋天使)',
      '琴爪缘 (Cure Macaron / 马卡龙天使)',
      '剑城晶 (Cure Chocolat / 巧克力天使)',
    ],
  },
  {
    city: '七色丘',
    members: [
      '星空幸 (Cure Happy / 快乐天使)',
      '日野茜 (Cure Sunny / 阳光天使)',
      '黄濑弥生 (Cure Peace / 和平天使)',
      '青木丽华 (Cure Beauty / 美丽天使)',
      '绿川直 (Cure March / 进行曲天使)',
    ],
  },
  {
    city: '加音町',
    members: [
      '北条响 (Cure Melody / 旋律天使)',
      '南野奏 (Cure Rhythm / 节奏天使)',
      '黑川爱莲 (Cure Beat / 节拍天使)',
      '调边亚子 (Cure Muse / 缪斯天使)',
    ],
  },
  {
    city: '健康市',
    members: [
      '花寺和佳 (Cure Grace / 恩典天使)',
      '泽泉知优 (Cure Fontaine / 喷泉天使)',
      '平光日向 (Cure Sparkle / 闪耀天使)',
      '风铃艾苏米 (Cure Earth / 大地天使)',
    ],
  },
  {
    city: '四叶镇',
    members: [
      '桃园爱 (Cure Peach / 蜜桃天使)',
      '苍乃美希 (Cure Berry / 蓝莓天使)',
      '山吹祈里 (Cure Pine / 凤梨天使)',
      '东刹那 (Cure Passion / 百香果天使)',
    ],
  },
  {
    city: '虹之园市',
    members: [
      '雪城穗乃香 (Cure White)',
      '美墨渚 (Cure Black)',
      '九条光 (Shiny Luminous)',
    ],
  },
  {
    city: '绿之乡',
    members: [
      '日向咲 (Cure Bloom / 花天使)',
      '美翔舞 (Cure Egret / 鹭天使)',
    ],
  },
  {
    city: '美味小镇',
    members: [
      '果彩天音 (Cure Yum-Yum / 美味天使)',
      '和实结 (Cure Precious / 珍贵天使)',
      '芙羽心音 (Cure Spicy / 香辣天使)',
      '华满兰 (Cure Finale / 终曲天使)',
    ],
  },
  {
    city: '希望之花镇',
    members: [
      '梦原望 (Cure Dream / 梦天使)',
      '春日野丽 (Cure Lemonade / 柠檬水天使)',
      '秋元小町 (Cure Mint / 薄荷天使)',
      '水无月香恋 (Cure Aqua / 水天使)',
      '夏木玲 (Cure Rouge / 胭脂天使)',
      'Milk / 美尔波 (Milky Rose / 妙奇露丝)',
    ],
  },
  {
    city: '观星町',
    members: [
      '羽衣拉拉 (Cure Milky / 银河天使)',
      '星奈光 (Cure Star / 星星天使)',
      '天宫爱莲娜 (Cure Soleil / 太阳天使)',
      '香九矢圆 (Cure Selene / 月亮天使)',
      '尤妮 (Cure Cosmo / 宇宙天使)',
    ],
  },
  {
    city: '蓝天市',
    members: [
      '夏海真夏 (Cure Summer / 夏日天使)',
      '凉村珊瑚 (Cure Coral / 珊瑚天使)',
      '一之濑实 (Cure Papaya / 木瓜天使)',
      '泷泽飞鸟 (Cure Flamingo / 火烈鸟天使)',
      '萝拉 (Cure La Mer / 海洋天使)',
    ],
  },
  {
    city: '私立诺布尔学园',
    members: [
      '春野遥 (Cure Flora / 花神天使)',
      '海藤南 (Cure Mermaid / 人鱼天使)',
      '天之川绮罗 (Cure Twinkle / 星光天使)',
      '红城永久 (Cure Scarlet / 绯红天使)',
    ],
  },
  {
    city: '未来学园',
    members: [
      '野乃花 (Cure Yell / 喝彩天使)',
      '药师寺纱绫 (Cure Ange / 安祈天使)',
      '辉木誉 (Cure Étoile / 星辰天使)',
      '爱崎惠美瑠 (Cure Macherie / 亲爱天使)',
    ],
  },
  {
    city: '闪亮市',
    members: [
      '野乃花 (Cure Yell / 喝彩天使)',
      '抱美/抱碳 (明日天使)',
      '药师寺纱绫 (Cure Ange / 安祈天使)',
      '辉木誉 (Cure Étoile / 星辰天使)',
    ],
  },
  {
    city: '私立明堂学园',
    members: [
      '月影百合 (Cure Moonlight / 月光天使)',
      '花咲蕾 (Cure Blossom / 花蕾天使)',
      '来海绘里香 (Cure Marine / 海天使)',
      '明堂院树 (Cure Sunshine / 阳光天使)',
    ],
  },
  {
    city: '光之丘学园',
    members: [
      '爱乃惠 (Cure Lovely / 可爱天使)',
      '大森悠子 (Cure Honey / 蜜糖天使)',
    ],
  },
  {
    city: '真未来市',
    members: [
      '小林未来',
      '明智安娜 (Cure Answer / 真相天使)',
      '森亚露露卡 (Cure Mystic / 奥秘天使)',
    ],
  },
  {
    city: '公主组',
    members: [
      '春野遥 (Cure Flora / 花神天使)',
      '海藤南 (Cure Mermaid / 人鱼天使)',
      '天之川绮罗 (Cure Twinkle / 星光天使)',
      '红城永久 (Cure Scarlet / 绯红天使)',
    ],
  },
];

// ─── 辅助函数 ───

function splitEntries(text) {
  // 分离 world_lores 头部（default config）和所有 keyword 条目
  const headerEnd = text.indexOf('\n\n  - keywords:');
  if (headerEnd === -1) throw new Error('Cannot find first keyword entry');

  const header = text.substring(0, headerEnd);
  const body = text.substring(headerEnd + 2); // skip leading \n\n

  // 按 "\n\n  - keywords:" 分割条目
  const entryTexts = body.split('\n\n  - keywords:');
  const entries = entryTexts.map((e, i) => {
    // 第一个条目已自带 "  - keywords:" 前缀，不需要再加
    if (e.startsWith('  - keywords:')) return e;
    return '  - keywords:' + e;
  });

  return { header, entries };
}

function parseEntry(entryText) {
  // 提取 keywords 列表
  const kwMatch = entryText.match(/^  - keywords:\n((?:      - .+\n?)+)/m);
  if (!kwMatch) return null;

  const kwLines = kwMatch[1].split('\n').filter(l => l.trim().startsWith('- '));
  const keywords = kwLines.map(l => l.trim().replace(/^- /, ''));

  // 提取 content 起始位置
  const contentIdx = entryText.indexOf('\n    content:');
  if (contentIdx === -1) return null;

  const preContent = entryText.substring(0, contentIdx + '\n    content:'.length);
  const contentRest = entryText.substring(contentIdx + '\n    content:'.length);

  return { keywords, preContent, contentRest, full: entryText };
}

function rebuildEntry(parsed) {
  const kwBlock = '  - keywords:\n' + parsed.keywords.map(k => `      - ${k}`).join('\n');
  return kwBlock + '\n    content:' + parsed.contentRest;
}

function removeKeyword(parsed, kw) {
  const idx = parsed.keywords.indexOf(kw);
  if (idx !== -1) {
    parsed.keywords.splice(idx, 1);
    return true;
  }
  return false;
}

// ─── 主逻辑 ───

console.log('Reading source file...');
let text = fs.readFileSync(SRC, 'utf8');

const { header, entries } = splitEntries(text);
console.log(`Found ${entries.length} keyword entries`);

// 备份
const bak = SRC + '.bak';
fs.writeFileSync(bak, text, 'utf8');
console.log(`Backup saved to ${path.basename(bak)}`);

// ─── 步骤 1: 高危关键词修复 ───
console.log('\n=== Step 1: Fixing risky keywords ===');
let riskyFixed = 0;
for (const fix of RISKY_FIXES) {
  for (let i = 0; i < entries.length; i++) {
    const parsed = parseEntry(entries[i]);
    if (!parsed) continue;
    // 用 matchKW 定位条目（必须匹配完整关键词）
    if (parsed.keywords.includes(fix.matchKW)) {
      if (removeKeyword(parsed, fix.remove)) {
        entries[i] = rebuildEntry(parsed);
        console.log(`  ✓ Removed "${fix.remove}" from entry with "${fix.matchKW}"`);
        riskyFixed++;
      }
    }
  }
}
console.log(`  Fixed ${riskyFixed} risky keywords`);

// ─── 步骤 2: 城市关键词剥离 ───
console.log('\n=== Step 2: Removing city keywords from character entries ===');
const allCities = CITY_GROUPS.map(g => g.city);
let cityFixed = 0;

for (const city of allCities) {
  // 跳过 虹之园市（在穗乃香_世界书.yml中保留，光美世界书中也保留穗乃香自己的条目）
  // 只在光美世界书中移除渚和光的虹之园市关键词

  for (let i = 0; i < entries.length; i++) {
    const parsed = parseEntry(entries[i]);
    if (!parsed) continue;

    // 检查该条目是否包含此城市关键词
    if (parsed.keywords.includes(city)) {
      // 移除城市关键词
      if (removeKeyword(parsed, city)) {
        entries[i] = rebuildEntry(parsed);
        console.log(`  ✓ Removed "${city}" from entry ${i + 1} (keywords: ${parsed.keywords.slice(0, 3).join(', ')}...)`);
        cityFixed++;
      }
    }
  }
}
console.log(`  Removed ${cityFixed} city keywords from character entries`);

// ─── 步骤 3: 追加城市摘要条目 ───
console.log('\n=== Step 3: Appending city summary entries ===');

let summaryEntries = '';
for (const group of CITY_GROUPS) {
  const memberList = group.members.map(m => `            - "${m}"`).join('\n');
  const content = `#${group.city}的光之美少女\n      \`\`\`yaml\n      ${group.city}_precure_summary:\n        location: "${group.city}"\n        precure_members:\n${memberList}\n        note: "详细角色信息请使用角色名关键词查询"\n      \`\`\``;

  summaryEntries += `\n\n  - keywords:\n      - ${group.city}\n    content: |-\n${content}`;
}

// ─── 步骤 4: 重新组装 ───
console.log('\n=== Step 4: Reassembling file ===');
const newText = header + '\n\n' + entries.join('\n\n') + summaryEntries + '\n';
fs.writeFileSync(SRC, newText, 'utf8');

const oldLines = text.split('\n').length;
const newLines = newText.split('\n').length;
console.log(`Old: ${oldLines} lines, New: ${newLines} lines (${newLines - oldLines > 0 ? '+' : ''}${newLines - oldLines})`);
console.log('Done!');
