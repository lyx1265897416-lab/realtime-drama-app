#!/usr/bin/env python3
"""从 Vicky 资产库挑一批现成角色，生成演员表种子 docs/data/actors.js。

图片用资产库线上展示版（GitHub Pages 上的 1280px WebP），不复制文件。
每个演员取一张定妆照（identity 优先，其次 full_body / face_turnaround）+ 一张全身照。
用法：python3 tools/seed_actors.py
"""
import json
from pathlib import Path

LIB = Path.home() / 'Documents/waku内容/vicky-character-library'
PAGES = 'https://lyx1265897416-lab.github.io/Vicky-Asset-Repository/'
OUT = Path(__file__).resolve().parents[1] / 'docs/data/actors.js'

# (资产库角色 id, 演员表里的档位)  star = 有完整设定的签约演员；rookie = 只有外形的新人，等用户培养
PICK = [
    ('human.magnus-magnus-doc-20261019', 'star'), ('human.heroine-magnus-doc-20261019', 'star'),
    ('animal.mii-nian-gao', 'star'), ('human.selene-magnus-doc-20261019', 'star'), ('human.luca-magnus-doc-20261019', 'star'),
    ('human.kellan-brooks', 'star'), ('human.aria-solano', 'star'), ('off-script.jamie', 'star'), ('off-script.theo', 'star'),
    ('off-script.owen', 'star'), ('off-script.mina', 'star'), ('human.yuna-park', 'star'), ('human.mara-vale', 'star'),
    ('human.harland-magnus-doc-20261019', 'star'), ('human.elias-magnus-doc-20261019', 'star'),
    ('human.magnus-heroines-complete-20261014-01', 'rookie'), ('human.magnus-heroines-complete-20261014-03', 'rookie'),
    ('human.magnus-heroines-complete-20261014-06', 'rookie'),
]
COLLAGE = {'human.aria-solano', 'human.kellan-brooks'}  # 这两位的 identity 是四宫格拼图，定妆照改用全身
TOP = {'human.magnus-magnus-doc-20261019', 'human.heroine-magnus-doc-20261019', 'animal.mii-nian-gao'}
ROOKIE_GROUPS = [('western-male-white-28-v3-20260923', 4), ('front-id-32-20260923', 3), ('3d-original-28-selected-20260924', 3)]


def main():
    lib = {x['id']: x for x in json.loads((LIB / 'character-library.json').read_text())['characters']}
    man = json.loads((LIB / 'deployment/github-pages/public/gallery-manifest.json').read_text())
    by = {}
    for a in man['assets']:
        for cid in a.get('character_ids') or []:
            by.setdefault(cid, []).append(a)
    pick = list(PICK)
    for proj, n in ROOKIE_GROUPS:
        ids = [cid for cid, x in lib.items() if x.get('source_project') == proj]
        pick += [(cid, 'rookie') for cid in ids[:n]]
    out = []
    for cid, tier in pick:
        x, assets = lib.get(cid), by.get(cid, [])
        if not x or not assets:
            print('跳过（无资产）', cid); continue
        def first(*cats):
            for c in cats:
                for a in assets:
                    if a['category'] == c:
                        return PAGES + a['path']
        face = first('full_body', 'identity') if cid in COLLAGE else first('identity', 'full_body', 'face_turnaround', 'head_angles')
        body = first('full_body', 'body_turnaround', 'identity') or face
        name = (x.get('display_name_zh') or cid).split(' · 文档确认版')[0]
        if tier == 'rookie':  # 新人只有外形：名字用造型描述，等签下的人来取名
            name = '新人 · ' + name.split(' · ')[-1]
        out.append({
            'id': 'lib.' + cid, 'source': cid, 'tier': tier, 'owner': 'Vicky 资产库',
            'name': name, 'name_en': (x.get('display_name_en') or name).split(' · ')[0],
            'age': x.get('age') if isinstance(x.get('age'), int) else None,
            'role': x.get('role_zh') or '', 'appearance': x.get('appearance') or '',
            'personality': x.get('personality') or [], 'signature': x.get('signature') or [],
            'project': x.get('source_project') or '', 'style': x.get('visual_family') or assets[0].get('style_family') or '',
            'species': assets[0].get('species') or 'human', 'face': face, 'body': body,
            'price': 0 if tier == 'rookie' else 120 if cid in TOP else 60,  # 片酬（星票/场）；新人免费签下培养
        })
    bios = json.loads((Path(__file__).with_name('actor_bios.json')).read_text())  # 资产库里缺的身份、性格，按剧集设定补
    for a in out:
        a.update(bios.get(a['source'], {}))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('window.ACTORS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
    print(len(out), '个演员 →', OUT)


if __name__ == '__main__':
    main()
