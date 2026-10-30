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
    ('human.elias-magnus-doc-20261019', 'star'),
]
TOP = {'human.magnus-magnus-doc-20261019', 'human.heroine-magnus-doc-20261019', 'animal.mii-nian-gao'}
# 新人待签：Vicky 2026-10-30 指定的 13 位。(角色 id, 资产库编号 = 她选的那张定妆照, 显示名)
ROOKIES = [
    ('research.white-D-03', 1637, '深色短发灰西装'), ('research.white-C-03', 1615, '雀斑金发鼠尾草'),
    ('human.3d-white-34-20260923-03', 716, '栗暖·日常'), ('human.3d-white-34-20260923-06', 737, '沙金·探险者'),
    ('human.3d-white-34-20260923-08', 751, '麦溪·田园'), ('human.3d-white-34-20260923-13', 795, '香槟·西装'),
    ('human.3d-white-34-20260923-26', 886, '雾银·轻运动'), ('human.3d-original-28-selected-20260924-02', 1434, '夜色机车'),
    ('human.3d-original-28-selected-20260924-04', 1448, '冬岸旅人'), ('human.research-white-27-20260923-18', 1048, '深色长发杏黄色裙装'),
    ('human.research-white-27-20260923-05', 971, '深棕长发白衬衫领带'), ('human.male-white-portraits-23-v2-20260923-03', 231, '从容自信'),
    ('human.western-male-white-28-v3-20260923-27', 1314, '金发黑大衣'),
]


def main():
    lib = {x['id']: x for x in json.loads((LIB / 'character-library.json').read_text())['characters']}
    man = json.loads((LIB / 'deployment/github-pages/public/gallery-manifest.json').read_text())
    by = {}
    for a in man['assets']:
        for cid in a.get('character_ids') or []:
            by.setdefault(cid, []).append(a)
    pick = list(PICK)
    pick += [(cid, 'rookie') for cid, _, _ in ROOKIES]
    chosen = {cid: (num, nm) for cid, num, nm in ROOKIES}
    out = []
    for cid, tier in pick:
        x, assets = lib.get(cid) or {}, by.get(cid, [])  # 个别角色只在图库清单里，不在 character-library.json
        if not assets:
            print('跳过（无资产）', cid); continue
        def first(*cats):
            for c in cats:
                for a in assets:
                    if a['category'] == c:
                        return PAGES + a['path']
        face = first('identity', 'full_body', 'face_turnaround', 'head_angles')
        body = first('full_body', 'body_turnaround', 'identity') or face
        name = (x.get('display_name_zh') or cid).split(' · 文档确认版')[0]
        if tier == 'rookie':  # 新人只有外形：名字用造型描述，等签下的人来取名；定妆照就用指定编号那张
            num, short = chosen[cid]
            name = '新人 · ' + short
            face = PAGES + next(a for a in assets if a.get('library_number') == num and a['category'] in ('identity', 'front'))['path']
        out.append({
            'id': 'lib.' + cid, 'source': cid, 'tier': tier, 'owner': 'Vicky 资产库',
            'name': name, 'name_en': (x.get('display_name_en') or name).split(' · ')[0],
            'age': x.get('age') if isinstance(x.get('age'), int) else None,
            'role': x.get('role_zh') or '', 'appearance': x.get('appearance') or '',
            'personality': x.get('personality') or [], 'signature': x.get('signature') or [],
            'project': x.get('source_project') or '', 'style': x.get('visual_family') or assets[0].get('style_family') or '',
            'species': assets[0].get('species') or 'human', 'gender': (assets[0].get('genders') or [''])[0], 'face': face, 'body': body,
            'price': 0 if tier == 'rookie' else 120 if cid in TOP else 60,  # 片酬（星票/场）；新人免费签下培养
        })
    bios = json.loads((Path(__file__).with_name('actor_bios.json')).read_text())  # 资产库里缺的身份、性格，按剧集设定补
    for a in out:
        a.update(bios.get(a['source'], {}))
    # 飞书「角色样例」文档里的角色：不在资产库线上版，图放 docs/actors/，人设在 tools/feishu_actors.json
    SITE = 'https://lyx1265897416-lab.github.io/realtime-drama-app/actors/'
    extra = [dict(a, id='fs.' + a['slug'], source='feishu.' + a['slug'], tier='star', owner='Vicky 角色内容包', face=f"{SITE}{a['slug']}-face.jpg", body=f"{SITE}{a['slug']}-body.jpg",
                  species='human', project='feishu-character-packs') for a in json.loads(Path(__file__).with_name('feishu_actors.json').read_text())]
    stars = [a for a in out if a['tier'] == 'star']
    lead = {'fs.rafael': 2, 'fs.heroine-rafael': 3, 'fs.rhys': 4, 'fs.june': 5, 'fs.owner': 7}  # 男女主排在最前
    head = stars[:2] + [a for a in extra if a['id'] in lead][:4] + [stars[2]] + [a for a in extra if a['id'] == 'fs.owner']
    out = head + stars[3:] + [a for a in extra if a['id'] not in lead] + [a for a in out if a['tier'] == 'rookie']
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('window.ACTORS = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
    print(len(out), '个演员 →', OUT)


if __name__ == '__main__':
    main()
