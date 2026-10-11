from pathlib import Path
import re,subprocess,json
root=Path(__file__).resolve().parents[2];errors=[];count=0
for p in (root/'js').rglob('*.js'):
 count+=1;r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if r.returncode:errors.append(r.stderr)
 for path in re.findall(r'(?:from\s*|import\s*\()\s*[\'\"](\.[^\'\"]+)',p.read_text()):
  if path=='./net/server-config.js':continue
  if not (p.parent/path).resolve().is_file():errors.append(f'{p}: missing import {path}')
for p in root.glob('*.html'):
 for path in re.findall(r'(?:src|href|poster)=[\'\"]([^\'\"]+)',p.read_text()):
  if re.match(r'^(https?:|data:|#|mailto:)',path):continue
  if not (p.parent/path.split('?')[0].split('#')[0]).is_file():errors.append(f'{p.name}: missing resource {path}')
assert not errors,'\n'.join(errors)
print(f'PASS {count} JavaScript syntax checks; all local imports and HTML resources resolve')
