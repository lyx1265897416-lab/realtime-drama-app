#!/usr/bin/env python3
"""演员卡和圆头像用的小图：把 actors.js 里每张 face 缩到 360 宽放 docs/actors/thumb/，映射写到 docs/data/thumbs.js。
演员表改了就重跑。用法：python3 tools/actor_thumbs.py"""
import hashlib, json, re, subprocess, tempfile
from pathlib import Path
HERE = Path(__file__).resolve().parents[1]; DOCS = HERE / 'docs'
FF = HERE.parents[1] / '.media-runtime/vivix-bin/ffmpeg'
PAGES = 'https://lyx1265897416-lab.github.io/realtime-drama-app/'
out = {}
for u in sorted(set(re.findall(r'"face":\s*"([^"]+)"', (DOCS / 'data/actors.js').read_text()))):
    rel = 'actors/thumb/' + hashlib.sha1(u.encode()).hexdigest()[:12] + '.jpg'; f = DOCS / rel
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(suffix=Path(u.split('?')[0]).suffix) as t:
            local = DOCS / u.split('?')[0].replace(PAGES, '')
            if u.startswith(PAGES) and local.exists(): src = str(local)
            else: subprocess.run(['curl', '-s', '--noproxy', '*', '-m', '60', '-f', '-o', t.name, u], check=True); src = t.name
            subprocess.run([str(FF), '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=360:-2:flags=lanczos', '-q:v', '5', str(f)], check=True)
    out[u] = rel
(DOCS / 'data/thumbs.js').write_text('window.THUMBS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'thumbs', sum((DOCS / x).stat().st_size for x in out.values()) // 1024, 'KB')
