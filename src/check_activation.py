#!/usr/bin/env python3
"""世界书激活自检：探针问题 -> 命中条目 -> 期望事实是否在命中条目里。

用法:
    python src/check_activation.py [预设路径] [探针 JSON]

不带参数时选 bin/exports/presets/ 下最新的 穗乃香.yml，探针默认
bin/reference_docs/activation-probes.json。

判据: 每个探针至少命中 1 个世界书条目，且 expect（正则）出现在命中条目的
keywords 或 content 里。只检查静态匹配，不调用模型。
"""

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROBES = ROOT / 'bin' / 'reference_docs' / 'activation-probes.json'


def latest_preset() -> Path:
    candidates = sorted(
        (ROOT / 'bin' / 'exports' / 'presets').glob('*/穗乃香.yml'),
        key=lambda p: p.stat().st_mtime,
    )
    if not candidates:
        raise SystemExit('没找到 bin/exports/presets/*/穗乃香.yml，先跑 integrate_preset.js')
    return candidates[-1]


def load_entries(preset_path: Path):
    preset = yaml.safe_load(preset_path.read_text(encoding='utf-8'))
    entries = [e for e in preset.get('world_lores', [])
               if isinstance(e, dict) and 'keywords' in e and 'content' in e]
    return preset, entries


def match_entries(entries, text: str):
    matched = []
    for idx, entry in enumerate(entries):
        keys = entry.get('keywords') or []
        hit = []
        for kw in keys:
            try:
                if re.search(kw, text):
                    hit.append(kw)
            except re.error:
                continue
        if hit:
            matched.append((idx, entry, hit))
    return matched


def main() -> int:
    preset_path = Path(sys.argv[1]) if len(sys.argv) > 1 else latest_preset()
    probes_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PROBES
    preset, entries = load_entries(preset_path)
    probes = json.loads(probes_path.read_text(encoding='utf-8'))

    print(f'预设: {preset_path}')
    print(f'条目: {len(entries)}  探针: {len(probes)}')
    failures = []
    for probe in probes:
        q = probe['q']
        expect = probe['expect']
        matched = match_entries(entries, q)
        if not matched:
            print(f'[MISS] {q} -> 没有条目命中')
            failures.append((q, 'no-entry'))
            continue
        ok = False
        for idx, entry, hit in matched:
            haystack = '\n'.join(hit) + '\n' + str(entry.get('content') or '')
            if re.search(expect, haystack):
                ok = True
        label = 'OK  ' if ok else 'FAIL'
        hit_desc = '; '.join(
            f"#{idx} {','.join(hit[:3])}" for idx, _, hit in matched)
        print(f'[{label}] {q} -> {hit_desc}')
        if not ok:
            failures.append((q, f'expect {expect} not found'))

    print()
    if failures:
        print(f'失败 {len(failures)}/{len(probes)}:')
        for q, why in failures:
            print(f'  - {q}: {why}')
        return 1
    print(f'全部通过（{len(probes)}/{len(probes)}）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
