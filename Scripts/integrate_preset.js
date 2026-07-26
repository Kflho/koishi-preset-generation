const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Determine output date folder: CLI arg (MM.DD) or today's date
const argDate = process.argv[2]; // e.g. node integrate_preset.js 07.18
const today = new Date();
const pad = n => String(n).padStart(2, '0');
const dateFolder = argDate || (pad(today.getMonth() + 1) + '.' + pad(today.getDate()));

const basePresetPath = path.join(root, '附属文件/穗乃香_预设/穗乃香_预设.yml');
const worldLoresPath = path.join(root, '附属文件/世界书/光之美少女世界书Koishi版.yml');
const honokaEntryPath = path.join(root, '附属文件/世界书/穗乃香_世界书.yml');

const outDir = path.join(root, '预设', dateFolder);
const backupDir = path.join(outDir, 'backup');
const outPath = path.join(outDir, '穗乃香.yml');

// Create output directories if needed
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });
console.log('Target: 预设/' + dateFolder + '/');

// Read files
const basePreset = fs.readFileSync(basePresetPath, 'utf8');
let worldLores = fs.readFileSync(worldLoresPath, 'utf8');
const honokaEntry = fs.readFileSync(honokaEntryPath, 'utf8').trim();

// --- Prepend the 穗乃香 entry into world_lores ---
// world_lores structure:
//   world_lores:
//     - scanDepth: 2        <-- config entry (no keywords)
//       tokenLimit: 2000
//       recursiveScan: true
//       maxRecursionDepth: 3
//
//     - keywords:           <-- first generated entry starts here
//         - xxx
//       content: xxx

// The honoka entry file is written without the 2-space indent for readability.
// We need to indent each line by 2 spaces before inserting.

// Remove leading/trailing blank lines and comments from honoka entry
const honokaLines = honokaEntry
  .split('\n')
  .filter(l => !l.startsWith('#') && l.trim() !== '');

// Indent by 2 spaces to match world_lores nesting level
const indentedHonoka = honokaLines.map(l => '  ' + l).join('\n');

// Find the insertion point: right after the config block (before the first "- keywords:")
const firstEntryMatch = worldLores.match(/\n  - keywords:/);
if (!firstEntryMatch) {
  console.error('Could not find first keywords entry in world_lores');
  process.exit(1);
}

const insertIdx = worldLores.indexOf('\n  - keywords:');
const before = worldLores.slice(0, insertIdx);
const after = worldLores.slice(insertIdx);

worldLores = before + '\n' + indentedHonoka + '\n' + after;

// --- Merge into base preset ---
// Backup existing output file if it exists
if (fs.existsSync(outPath)) {
  const bakPath = path.join(backupDir, '穗乃香.yml.bak');
  fs.copyFileSync(outPath, bakPath);
  console.log('Backup: ' + bakPath);
}

// Base preset doesn't have world_lores — insert before format_user_prompt
const insertPoint = basePreset.indexOf('\nformat_user_prompt:');
if (insertPoint === -1) {
  console.error('Could not find format_user_prompt in base preset');
  process.exit(1);
}

const presetBefore = basePreset.slice(0, insertPoint);
const presetAfter = basePreset.slice(insertPoint);
const newPreset = presetBefore + '\n' + worldLores + '\n' + presetAfter;

// Write output
fs.writeFileSync(outPath, newPreset, 'utf8');

const kb = s => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1);
console.log('Source preset: ' + basePresetPath + ' (' + kb(basePreset) + ' KB)');
console.log('Honoka entry: ' + honokaEntryPath + ' (' + kb(honokaEntry) + ' KB)');
console.log('World lores: ' + worldLoresPath + ' (' + kb(worldLores) + ' KB -> ' + kb(before + honokaEntry + after) + ' KB combined)');
console.log('Output: ' + outPath + ' (' + kb(newPreset) + ' KB)');

// Verify
const count = (newPreset.match(/^world_lores:/gm) || []).length;
if (count > 1) {
  console.error('ERROR: Found ' + count + ' world_lores sections in output!');
  process.exit(1);
}

// Verify 穗乃香 entry is first
const firstEntryPos = newPreset.indexOf('\n  - keywords:');
const honokaCheck = newPreset.indexOf('穗乃香', firstEntryPos);
const secondEntryPos = newPreset.indexOf('\n  - keywords:', firstEntryPos + 1);
if (honokaCheck > 0 && honokaCheck < secondEntryPos) {
  console.log('Honoka entry position: FIRST (OK)');
} else {
  console.log('Honoka entry position: NOT first — check output');
}
console.log('world_lores count: ' + count + ' (OK)');
