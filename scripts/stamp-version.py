#!/usr/bin/env python3
"""ใส่เลขเวอร์ชันท้ายทุก import แบบ relative (./ ../) ใน js/**/*.js และ index.html
→ เบราว์เซอร์โหลดไฟล์ใหม่ทุกครั้งที่อัปเดตเกม (ไม่ค้างแคชเก่า) · รันก่อนแพ็กทุกครั้ง: python3 scripts/stamp-version.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
cfg = (root / 'js/config.js').read_text(encoding='utf8')
ver = re.search(r"VERSION\s*=\s*'([^']+)'", cfg).group(1)
pm = re.search(r"PATCH\s*=\s*(\d+)", cfg); patch = int(pm.group(1)) if pm else 0
note = ''
nm = re.search(r"\{ v: '" + re.escape(ver) + r"', fix: " + str(patch) + r",[^}]*?title: '([^']*)'", (root / 'js/data/patchNotes.js').read_text(encoding='utf8')) if patch else None
if nm: note = nm.group(1)
cm = re.search(r"CACHE\s*=\s*(\d+)", cfg); cache = int(cm.group(1)) if cm else 0
qv = ver + (f'-p{patch}' if patch else '') + (f'.{cache}' if cache else '')   # ?v= ใหม่ทุกครั้งที่แก้ไข (เบราว์เซอร์โหลดไฟล์ใหม่) แต่เลขเวอร์ชันในเกมเท่าเดิม
pat = re.compile(r"""((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])""")
n = 0
for p in list((root / 'js').rglob('*.js')) + [root / 'index.html']:
    s = p.read_text(encoding='utf8')
    t = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={qv}{m.group(3)}", s)
    t = re.sub(r'(href="css/[^"?]+\.css)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={qv}"', t)
    t = re.sub(r'(src="js/main\.js)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={qv}"', t)
    if t != s: p.write_text(t, encoding='utf8'); n += 1
print('stamped', qv, 'files', n)

# v0.91 ไฟล์บอกเวอร์ชันล่าสุดบนเว็บ (เกมที่เปิดค้างไว้เช็กไฟล์นี้ทุกไม่กี่นาที → ขึ้นปุ่ม "อัปเดตเลย")
import json, datetime
built = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%Y-%m-%dT%H:%M:%S+07:00')
(root / 'version.json').write_text(json.dumps({'version': ver, 'patch': patch, 'note': note, 'built': built}, ensure_ascii=False) + '\n', encoding='utf8')
(root / 'js' / 'build.js').write_text(f"// สร้างอัตโนมัติโดย scripts/stamp-version.py — เวลาที่แพ็กเวอร์ชันนี้ (เวลาไทย)\nexport const BUILT = '{built}';\n", encoding='utf8')
print('version.json', ver, built)
