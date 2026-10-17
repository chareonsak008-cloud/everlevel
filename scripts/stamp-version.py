#!/usr/bin/env python3
"""ใส่เลขเวอร์ชันท้ายทุก import แบบ relative (./ ../) ใน js/**/*.js และ index.html
→ เบราว์เซอร์โหลดไฟล์ใหม่ทุกครั้งที่อัปเดตเกม (ไม่ค้างแคชเก่า) · รันก่อนแพ็กทุกครั้ง: python3 scripts/stamp-version.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
ver = re.search(r"VERSION\s*=\s*'([^']+)'", (root / 'js/config.js').read_text()).group(1)
pat = re.compile(r"""((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])""")
n = 0
for p in list((root / 'js').rglob('*.js')) + [root / 'index.html']:
    s = p.read_text(encoding='utf8')
    t = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver}{m.group(3)}", s)
    t = re.sub(r'(href="css/[^"?]+\.css)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={ver}"', t)
    t = re.sub(r'(src="js/main\.js)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={ver}"', t)
    if t != s: p.write_text(t, encoding='utf8'); n += 1
print('stamped', ver, 'files', n)
