#!/usr/bin/env python3
"""把 catalog.json 里登记的剧集，从 realtime 测试记录页的数据里拼成 APP 用的 docs/data/catalog.js。

每部剧取一条完整成片（film）+ 同一次测试的一组卡片（group）：
- 成片的章节 → 幕列表（ep = 预制剧情，rt = 实时生成）
- 字幕 VTT → 台词（标出哪条是她的输入，播放时由 APP 自己画输入气泡）
- 卡片 → 每一轮她说了什么、他回了什么、下一轮选项、当时的真实等待时间、精彩片段视频
用法：python3 build_catalog.py（输出 docs/data/catalog.js，GitHub Pages 从 docs/ 发布）
"""
import json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CFG = json.loads((HERE / 'catalog.json').read_text())
LOG = (HERE / CFG['log_dir']).resolve()
BASE = CFG['media_base']


def load_log():
    src = (LOG / 'data.js').read_text()
    d = json.loads(src[src.index('{'):src.rindex('}') + 1])
    out = {x['id']: x for x in d['dramas']}
    for f in (LOG / 'dramas').glob('*.json'):
        x = json.loads(f.read_text())
        out[x['id']] = x
    return out


def ts(s):
    h, m, rest = s.split(':') if s.count(':') == 2 else ('0',) + tuple(s.split(':'))
    return int(h) * 3600 + int(m) * 60 + float(rest)


def parse_vtt(path):
    cues = []
    for block in re.split(r'\n\s*\n', path.read_text()):
        lines = [l for l in block.strip().splitlines() if l.strip()]
        i = next((k for k, l in enumerate(lines) if '-->' in l), None)
        if i is None:
            continue
        a, b = [x.strip().split(' ')[0] for x in lines[i].split('-->')]
        text = lines[i + 1:]
        marker = any('实时生成' in l or 'Realtime' in l for l in text)
        text = [l for l in text if not re.match(r'^（实时生成', l)]
        zh = next((l for l in text if re.search(r'[一-鿿]', l)), '')
        en = next((l for l in text if l != zh), '')
        who = None
        m = re.match(r'^(你|她)[：:]\s*', zh)
        if m:
            who = 'you'
            zh = zh[m.end():]
        if re.match(r'^(You|Her):\s*', en):
            who = 'you'
            en = re.sub(r'^(You|Her):\s*', '', en)
        cues.append({'s': round(ts(a), 2), 'e': round(ts(b), 2), 'zh': zh, 'en': en,
                     'who': who, 'input': bool(marker or re.match(r'^(You|Her):', ' '.join(text[1:2]) or ''))})
    return cues


def rename(c):  # 剧名已改为「与狼为伍」，成片字幕里的旧片名卡跟着换
    for k in ('zh', 'en'):
        c[k] = c[k].replace('午夜车库', '与狼为伍').replace('Midnight Garage', 'Running with Wolves')
    return c


def speaker(c, d):  # 开场字幕里写明了说话人的（比如 Evan），预览回放也按它标，不一律标成男主
    for q in (d.get('live') or {}).get('open_cues') or []:
        if q.get('who') and q.get('en') == c['en'] and q['who'] != 'you':
            c['sp'] = q['who']
    return c


def pick(items, needle, key='title'):
    for x in items:
        if needle in x.get(key, ''):
            return x
    raise SystemExit(f'找不到「{needle}」，可选：' + ' / '.join(x.get(key, '') for x in items))


def options(rule):
    m = re.search(r'(?:Next options|下一轮选项)[:：]\s*A\s*(.+?)\s*[／/]\s*B\s*(.+)$', rule or '')
    return [m.group(1).strip(), m.group(2).strip()] if m else []


def stat(card, *names):
    for k, v in card.get('stats', []):
        if k in names:
            n = re.match(r'[\d.]+', v)
            return float(n.group()) if n else None
    return None


def build(d, log):
    src = log[d['source']['log']]
    film = pick(src['films'], d['source']['film'])
    group = pick(src['groups'], d['source']['group'])
    cards = group['cards']
    cues = parse_vtt(LOG / film['vtt'])
    # 输入卡：带“实时生成”标记，或英文以 You:/Her: 开头
    inputs = [c for c in cues if c['input']]
    for c in inputs:
        c['who'] = 'you'
    chapters, rt_i = [], 0
    chs = film['chapters']
    for i, (kind, label, start) in enumerate(chs):
        end = chs[i + 1][2] if i + 1 < len(chs) else film['duration']
        ch = {'kind': 'ep' if kind == 'ep' else 'rt', 'label': label, 'start': start, 'end': round(end, 2)}
        if ch['kind'] == 'rt':
            card = cards[rt_i] if rt_i < len(cards) else {}
            near = min(inputs, key=lambda c: abs(c['s'] - start), default=None)
            if near and abs(near['s'] - start) < 6:
                ch['pause'] = round(min(near['s'], start) - .05, 2)
                ch['resume'] = round(max(near['e'], start), 2)
                ch['said'] = {'zh': near['zh'], 'en': near['en']}
                if d.get('name') == 'Mii':  # 咪的成片字幕把“咪”误译成 Mate
                    ch['said']['en'] = re.sub(r'\bMate\b', 'Mii', ch['said']['en'])
            else:
                ch['pause'] = ch['resume'] = start
                ch['said'] = {'zh': card.get('her', ''), 'en': card.get('her', '')}
            prev = cards[rt_i - 1] if rt_i else None
            ch['options'] = options(prev.get('rule')) if prev else []
            ch['wait'] = stat(card, '发送到开播') or stat(card, '第 2 段就绪')
            ch['clip'] = card.get('video') and BASE + card['video']
            ch['poster'] = card.get('poster') and BASE + card['poster']
            ch['beat'] = (card.get('beat') or '').split('；')[0][:80]
            if card.get('her') and ch['said']['zh'] and card['her'][:4] not in (ch['said']['zh'] + ch['said']['en']):
                print(f"  ! {d['id']} {label}：字幕输入「{ch['said']['zh'][:20]}」和卡片「{card['her'][:20]}」对不上", file=sys.stderr)
            rt_i += 1
        chapters.append(ch)
    cover_round = d.get('cover_round')
    if d.get('cover_local'):
        cover = d['cover_local']
    elif d.get('cover'):
        cover = BASE + d['cover']
    elif cover_round:
        cover = BASE + cards[cover_round - 1]['poster']
    else:
        cover = BASE + film['poster']
    rts = [c for c in chapters if c['kind'] == 'rt']
    waits = sorted(c['wait'] for c in rts if c.get('wait'))
    out = {k: v for k, v in d.items() if k not in ('source', 'cover', 'cover_local')}
    out.update({
        'cover': cover,
        'film': {'video': BASE + film['video'], 'poster': BASE + film['poster'], 'duration': film['duration'], 'mode': film.get('mode', '')},
        'cues': [speaker(rename({k: c[k] for k in ('s', 'e', 'zh', 'en', 'who')}), d) for c in cues if not c['input']],
        'chapters': chapters,
        'opening': cut_opening(d, film, rts[0]['pause']),
        'rounds': len(rts),
        'episodes': sum(1 for c in chapters if c['kind'] == 'ep' and c['label'] not in ('Opening', '开场')),
        'wait_median': waits[len(waits) // 2] if waits else None,
        'tested': group.get('when', ''),
    })
    print(f"  {d['id']}: {len(chapters)} 段 · {len(rts)} 个实时轮次 · 成片 {film['duration']}s")
    return out


def cut_opening(d, film, end):
    """剧场轮播用的开场片段：成片开头到第一个选择点，静音、540 宽，放 docs/openings/。已有就不重剪。"""
    out = HERE / 'docs' / 'openings' / f"{d['id']}.mp4"
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        ff = HERE.parents[1] / '.media-runtime/vivix-bin/ffmpeg'
        subprocess.run([str(ff), '-y', '-loglevel', 'error', '-i', str(LOG / film['video']), '-t', f'{end:.2f}', '-an', '-vf', 'scale=540:-2',
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)], check=True)
    return f"openings/{d['id']}.mp4"


def main():
    log = load_log()
    data = {'updated': log.get('magnus-preset', {}).get('updated') or '', 'dramas': [build(d, log) for d in CFG['dramas']]}
    src = (LOG / 'data.js').read_text()
    m = re.search(r'"updated":\s*"([^"]+)"', src)
    data['updated'] = m.group(1) if m else ''
    out = HERE / 'docs' / 'data' / 'catalog.js'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('window.CATALOG = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('→', out.relative_to(HERE))


if __name__ == '__main__':
    main()
