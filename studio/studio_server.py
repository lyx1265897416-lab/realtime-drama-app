#!/usr/bin/env python3
"""即兴剧场 · 创作服务（演员、钱包、自由剧场）。

APP 是 GitHub Pages 上的静态页，需要模型和共享数据的功能都走这里：
  POST /api/me        {k, uid, nick}                     → 钱包（新用户送 300 体验星票）、收益、流水
  POST /api/topup     {k, uid}                           → 领 300 体验星票（测试用，不是真钱）
  POST /api/assist    {k, uid, card}                     → AI 补全角色设定（免费）
  POST /api/grow      {k, uid, card, said, scene}        → 从刚演完的一幕里提炼新设定（免费）
  POST /api/portrait  {k, uid, card, style}              → 生成定妆照，扣 80 星票，失败退回
  POST /api/stage     {k, uid, stage, persona, cast, history, input}  → 自由剧场：写下一幕（台词、旁白、两个选项、新设定）
  POST /api/frame     {k, uid, scene, cast}              → 自由剧场：给这一幕出一张画面，扣 30 星票
  GET  /api/market?k= → 玩家上架的演员；POST /api/publish {k, uid, actor} / /api/unpublish {k, uid, id}
  POST /api/hire      {k, uid, actor, purpose}           → 雇演员：扣片酬，70% 进演员主人的钱包，30% 平台
  GET  /img/<文件>     → 生成的图片
星票只是测试币，没有任何真钱流转。数据存在 studio/data/。
用法：python3 studio_server.py <口令> [端口，默认 8860]
"""
import base64, json, os, re, sys, threading, time, uuid
import urllib.request as U
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOKEN = sys.argv[1] if len(sys.argv) > 1 else ''
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8860
D = Path(__file__).resolve().parent / 'data'
IMG = D / 'img'
IMG.mkdir(parents=True, exist_ok=True)
KEYFILE = '/Users/vicky/Documents/waku内容/magnus-realtime/app/.dev.vars'  # 和实时导演层共用的 OpenRouter key
TEXT_MODEL, FAST_MODEL, IMAGE_MODEL = 'anthropic/claude-sonnet-5.5', 'anthropic/claude-haiku-5.5', 'google/gemini-nano-banana-2.1'
PRICE = {'portrait': 80, 'frame': 30, 'gift': 300}
SHARE = 0.7  # 演员主人拿片酬的 70%
LIB_OWNER = 'vicky-asset-library'
LOCK = threading.Lock()

ACTORS = Path(__file__).resolve().parents[1] / 'docs/data/actors.js'
LIB = {a['id']: a for a in json.loads(ACTORS.read_text()[ACTORS.read_text().index('['):ACTORS.read_text().rindex(']') + 1])}


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def load(name, default):
    f = D / f'{name}.json'
    return json.loads(f.read_text()) if f.exists() else default


def store(name, obj):
    f = D / f'{name}.json'
    f.with_suffix('.tmp').write_text(json.dumps(obj, ensure_ascii=False, indent=1)); f.with_suffix('.tmp').replace(f)


WALLETS = load('wallets', {})   # uid → {nick, balance, earned, ledger[]}
MARKET = load('market', {})     # 演员 id → 上架卡片（含 owner uid）
STATS = load('stats', {})       # 演员 id → {hires, earned}


def wallet(uid, nick=None):
    w = WALLETS.get(uid)
    if not w:
        w = WALLETS[uid] = {'nick': nick or '旅人', 'balance': PRICE['gift'], 'earned': 0, 'ledger': [{'at': now(), 'd': PRICE['gift'], 'what': '新人体验星票'}]}
    if nick: w['nick'] = nick[:20]
    return w


def now():
    return int(time.time() * 1000)


def move(uid, d, what):
    w = wallet(uid)
    if d < 0 and w['balance'] + d < 0:
        raise PermissionError(f'星票不够：需要 {-d}，余额 {w["balance"]}')
    w['balance'] += d; w['ledger'] = ([{'at': now(), 'd': d, 'what': what}] + w['ledger'])[:60]
    if d > 0 and what.startswith('片酬'): w['earned'] += d


def key():
    if os.environ.get('OPENROUTER_API_KEY'): return os.environ['OPENROUTER_API_KEY']  # launchd 托管时读不到“文档”目录
    for line in open(KEYFILE, encoding='utf-8'):
        k, _, v = line.strip().partition('=')
        if k == 'OPENROUTER_API_KEY' and v.strip(): return v.strip().strip('"\'')
    raise RuntimeError('OPENROUTER_API_KEY 没有配置')


def chat(model, system, user, max_tokens=1800, images=None, image_out=False, timeout=90):
    content = [{'type': 'text', 'text': user}] + [{'type': 'image_url', 'image_url': {'url': u}} for u in (images or [])]
    body = {'model': model, 'max_tokens': max_tokens, 'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': content}]}
    if image_out: body['modalities'] = ['image', 'text']
    else: body['reasoning'] = {'effort': 'low'}; body['temperature'] = 0.8
    req = U.Request('https://openrouter.ai/api/v1/chat/completions', data=json.dumps(body).encode(),
                    headers={'Authorization': 'Bearer ' + key(), 'Content-Type': 'application/json', 'X-Title': 'Unscripted studio'})
    with U.urlopen(req, timeout=timeout) as r: j = json.loads(r.read())
    msg = j['choices'][0]['message']
    if image_out:
        for im in msg.get('images') or []:
            u = (im.get('image_url') or {}).get('url', '')
            if u.startswith('data:image'): return u
        raise RuntimeError('生图没有返回图片：' + (msg.get('content') or '')[:120])
    txt = msg.get('content') or ''
    i = txt.find('{')
    if i < 0: raise ValueError('模型没有返回 JSON：' + txt[:160])
    return json.JSONDecoder().raw_decode(txt[i:])[0]


def save_image(data_url):  # 压到长边 1080 的 JPEG：隧道慢，原图 600KB+ 在手机上要等很久
    raw = base64.b64decode(data_url.split(',', 1)[1])
    name = f'{uuid.uuid4().hex[:16]}.jpg'
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((1080, 1080)); im.save(IMG / name, quality=84)
    except ImportError:
        (IMG / name).write_bytes(raw)
    return '/img/' + name


def as_ref(u):  # 自己生成的图在本机：转成 data URL 交给生图模型
    m = re.search(r'/img/([0-9a-f]{16}\.(?:png|jpg|webp))$', u or '')
    if m and (IMG / m.group(1)).exists():
        return 'data:image/jpeg;base64,' + base64.b64encode((IMG / m.group(1)).read_bytes()).decode()
    return u if (u or '').startswith('http') else None


def card_text(c):
    if not c: return '（空白：玩家没有带角色，按无设定的“你”来写）'
    keys = [('name', '名字'), ('age', '年龄'), ('gender', '性别'), ('job', '职业/身份'), ('look', '外形'), ('personality', '性格'), ('likes', '喜好'),
            ('voice', '说话方式'), ('backstory', '来历'), ('world', '世界观'), ('secret', '秘密'), ('goal', '想要的东西')]
    out = [f'{zh}：{"、".join(c[k]) if isinstance(c.get(k), list) else c[k]}' for k, zh in keys if c.get(k)]
    if c.get('memories'): out.append('演出记忆：' + '；'.join(m.get('text', '') for m in c['memories'][-6:]))
    return '\n'.join(out) or '（只有名字以外都没写）'


ASSIST_SYS = """你是互动剧的角色设计师。玩家正在创作一个会被带进不同剧集里演戏的原创角色（也可能被别的玩家雇来演戏）。
根据已经填写的字段补全空着的字段，已经填了的一字不改。要求：具体、有画面感、能直接演；性格给 3 个短词；来历 2–3 句，留一个能被剧情挖的钩子；
look 写成能直接拿去生成定妆照的外形描述（发型、脸、体型、标志性穿着），不写种族刻板印象；内容适合 16+，不写露骨内容。
只输出 JSON：{"fill": {字段: 值, ...}, "tagline": "一句话人设", "note": "给玩家的一句建议"}。字段名用：name, age, gender, job, look, personality(数组), likes, voice, backstory, world, secret, goal。"""

GROW_SYS = """你在维护一个互动剧角色的设定卡。玩家刚用这个角色演完一幕，从她说的话和剧情里，找出卡上还没有、但这一幕已经确立的新设定（名字、职业、来历、关系、习惯、秘密、目标……）。
不编造玩家没表达的东西；和卡上冲突时以这一幕为准并说明。最多 3 条。只输出 JSON：{"grow": [{"field": 字段名, "value": 新值, "why": "来自哪句话（10 字内）"}]}。字段名同角色卡：name, age, job, personality, likes, voice, backstory, world, secret, goal, memories。"""

STAGE_SYS = """你是「即兴剧场」自由剧场的编剧兼导演。玩家用自己的角色（或无设定的“你”）和雇来的演员一起即兴演一出剧，每一轮玩家说一句话或做一个动作，你写接下来的一幕。
规则：
- 先接住玩家这一句，当场给出回应；再推进一步（新信息、新动作、换场或新冲突）；最后留一个钩子。不原地问答，不复读设定。
- 演员只演自己卡上的人设，台词贴合说话方式；玩家角色的台词不替玩家写，只写旁白里她的动作结果。
- 台词英文为主（这是给海外观众的剧），每句附中文翻译；旁白中文。一幕 2–5 句台词。
- 演员只知道剧情里已经发生、说出口的事：玩家角色的名字、过去和秘密，在她亲口说出或剧情揭示之前，别人不能叫出、不能知道。
- 玩家说出口的新设定要记下来（grow），field 只能用 name, age, job, personality, likes, voice, backstory, world, secret, goal, memories。内容适合 16+，亲密戏点到为止。
只输出 JSON：{"place": "地点", "narration": "旁白（中文，1–2 句）", "lines": [{"who": 演员名, "en": "...", "zh": "..."}], "beat": "这一幕的画面描述（中文，给生图用，写清谁在哪做什么、景别）",
"options": [{"zh": "...", "en": "..."}, {"zh": "...", "en": "..."}], "grow": [{"field": ..., "value": ..., "why": ...}], "hook": "钩子（中文一句）"}"""


def assist(b):
    c = b.get('card') or {}
    ref = as_ref(c.get('face'))  # 已经有定妆照：外形、年龄感、性别按照片写，不另编
    return chat(FAST_MODEL, ASSIST_SYS, '当前角色卡：\n' + json.dumps({k: v for k, v in c.items() if k in ('name', 'age', 'gender', 'job', 'look', 'personality', 'likes', 'voice', 'backstory', 'world', 'secret', 'goal')}, ensure_ascii=False)
                + ('\n附图是这个角色已经定下的定妆照：look、年龄、性别必须和照片一致（发型发色、脸、体型、穿着照实描述），其余字段贴合这张脸的气质。' if ref else '')
                + ('\n玩家补充：' + b['hint'] if b.get('hint') else ''), images=[ref] if ref else None)


def grow(b):
    return chat(FAST_MODEL, GROW_SYS, f"角色卡：\n{card_text(b.get('card'))}\n\n这一幕剧集：{b.get('drama', '')}\n玩家这一句：{b.get('said', '')}\n这一幕的台词：{json.dumps(b.get('scene') or [], ensure_ascii=False)[:1500]}")


STYLE = {'real': 'photorealistic live-action portrait, soft natural window light, natural skin texture, 50mm shallow depth of field',
         'otome': 'polished 2.5D otome-game character art, semi-realistic 3D render, soft rim light, glossy hair',
         'cozy': 'warm photoreal domestic portrait, cream and wood tones, gentle morning light'}


def portrait(b):
    c = b.get('card') or {}
    style = STYLE.get(b.get('style'), STYLE['real'])
    prompt = (f"Create one vertical 3:4 character portrait (head to mid-thigh), single character, plain light studio background, no text, no watermark. Style: {style}. "
              f"Character: {c.get('name') or 'an original character'}, age {c.get('age') or 'young adult'}, {c.get('gender') or ''}, {c.get('job') or ''}. Appearance: {c.get('look') or 'distinctive, memorable look'}. "
              f"Expression and pose show this personality: {', '.join(c.get('personality') or []) if isinstance(c.get('personality'), list) else c.get('personality') or ''}. Tasteful, fully clothed.")
    return {'url': save_image(chat(IMAGE_MODEL, 'You are an image generator.', prompt, image_out=True, timeout=150)), 'prompt': prompt}


def stage(b):
    st, cast = b.get('stage') or {}, b.get('cast') or []
    hist = '\n'.join(f"第{i + 1}幕 玩家：{h.get('said', '')} ｜ {h.get('sum', '')}" for i, h in enumerate((b.get('history') or [])[-8:])) or '（这是第一幕）'
    user = (f"剧名：{st.get('title') or '无题'}\n世界观与开场：{st.get('world') or '（玩家没写，按演员的人设自然开场）'}\n\n"
            f"玩家的角色：\n{card_text(b.get('persona'))}\n\n雇来的演员：\n" + ('\n\n'.join(f"【{a.get('name')}】\n{card_text(a)}" for a in cast) or '（没有雇演员，只有旁白和玩家）')
            + f"\n\n剧情记录：\n{hist}\n\n玩家这一句：{b.get('input') or '（开场，请写第一幕，把玩家带进场景）'}")
    return chat(TEXT_MODEL, STAGE_SYS, user, max_tokens=2200)


def frame(b):
    cast = b.get('cast') or []
    cast = [a for a in cast if as_ref(a.get('face'))][:3]
    refs = [as_ref(a['face']) for a in cast]
    prompt = (f"Create one vertical 9:16 cinematic film still for an interactive drama. Scene: {b.get('beat', '')}. Place: {b.get('place', '')}. "
              f"Characters must match the reference portraits exactly (same face, hair, outfit): " + '; '.join(f"reference {i + 1} = {a.get('name')}" for i, a in enumerate(cast[:3]))
              + ". Natural cinematic lighting, no text, no subtitles, no watermark, tasteful.")
    return {'url': save_image(chat(IMAGE_MODEL, 'You are an image generator.', prompt, images=refs, image_out=True, timeout=150))}


def hire(b):
    uid, a = b['uid'], b.get('actor') or {}
    aid = a.get('id', '')
    listing = MARKET.get(aid) or LIB.get(aid)
    if not listing: raise LookupError('这个演员不在演员表里')
    price = int(listing.get('price') or 0)
    owner = listing.get('owner_uid') or LIB_OWNER
    st = STATS.setdefault(aid, {'hires': 0, 'earned': 0})
    st['hires'] += 1
    if owner == uid or price == 0:
        return {'paid': 0, 'hires': st['hires']}
    move(uid, -price, f"雇 {listing.get('name')} · {'主演' if b.get('purpose') == 'lead' else '搭戏'}")
    cut = int(round(price * SHARE)); st['earned'] += cut
    move(owner, cut, f"片酬 · {listing.get('name')} 被 {wallet(uid)['nick']} 雇用")
    return {'paid': price, 'hires': st['hires']}


def charged(uid, cost, what, fn, b):
    with LOCK: move(uid, -cost, what); store('wallets', WALLETS)
    try:
        return fn(b)
    except Exception:
        with LOCK: move(uid, cost, '退回 · ' + what); store('wallets', WALLETS)
        raise


class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def out(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode(); self.send_response(code); self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.send_header('Access-Control-Max-Age', '86400'); self.end_headers()

    def do_GET(self):
        path, _, qs = self.path.partition('?'); q = dict(x.split('=', 1) for x in qs.split('&') if '=' in x)
        if path.startswith('/img/') and re.fullmatch(r'/img/[0-9a-f]{16}\.(png|jpg|webp)', path):
            f = IMG / path[5:]
            if not f.exists(): return self.out(404, {'err': 'not found'})
            b = f.read_bytes(); self.send_response(200); self.cors()
            self.send_header('Content-Type', 'image/' + ('jpeg' if f.suffix == '.jpg' else f.suffix[1:])); self.send_header('Cache-Control', 'max-age=31536000')
            self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if q.get('k') != TOKEN: return self.out(403, {'err': 'bad token'})
        if path == '/api/ping': return self.out(200, {'ok': True, 'text': TEXT_MODEL, 'image': IMAGE_MODEL, 'price': PRICE})
        if path == '/api/market':
            return self.out(200, {'actors': [dict(a, **STATS.get(a['id'], {})) for a in MARKET.values()], 'stats': STATS})
        self.out(404, {'err': 'not found'})

    def do_POST(self):
        try: b = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)) or 0) or b'{}')
        except ValueError: return self.out(400, {'err': 'bad json'})
        if b.get('k') != TOKEN: return self.out(403, {'err': 'bad token'})
        uid = str(b.get('uid') or '')[:40]
        if not re.fullmatch(r'[A-Za-z0-9_-]{8,40}', uid): return self.out(400, {'err': 'bad uid'})
        p = self.path; t0 = time.time()
        try:
            with LOCK: w = wallet(uid, b.get('nick'))
            if p == '/api/me':
                with LOCK: store('wallets', WALLETS)
                return self.out(200, {'wallet': w, 'mine': [dict(a, **STATS.get(a['id'], {})) for a in MARKET.values() if a.get('owner_uid') == uid]})
            if p == '/api/topup':
                with LOCK: move(uid, PRICE['gift'], '领取体验星票'); store('wallets', WALLETS)
                return self.out(200, {'wallet': w})
            if p == '/api/assist': r = assist(b)
            elif p == '/api/grow': r = grow(b)
            elif p == '/api/stage': r = stage(b)
            elif p == '/api/portrait': r = charged(uid, PRICE['portrait'], '生成定妆照', portrait, b)
            elif p == '/api/frame': r = charged(uid, PRICE['frame'], '生成剧照', frame, b)
            elif p == '/api/publish':
                a = dict(b.get('actor') or {}); a['id'] = a.get('id') if str(a.get('id', '')).startswith('u.') else 'u.' + uuid.uuid4().hex[:10]
                old = MARKET.get(a['id'])
                if old and old.get('owner_uid') != uid: return self.out(403, {'err': '不是你的演员'})
                a.update(owner_uid=uid, owner=w['nick'], price=max(0, min(500, int(a.get('price') or 0))), listed_at=now())
                with LOCK: MARKET[a['id']] = a; store('market', MARKET)
                r = {'actor': a}
            elif p == '/api/unpublish':
                a = MARKET.get(b.get('id'))
                if not a or a.get('owner_uid') != uid: return self.out(403, {'err': '不是你的演员'})
                with LOCK: MARKET.pop(b['id']); store('market', MARKET)
                r = {'ok': True}
            elif p == '/api/hire':
                with LOCK: r = hire(b); store('wallets', WALLETS); store('stats', STATS)
            else: return self.out(404, {'err': 'not found'})
            log(p, uid[:8], f'{time.time() - t0:.1f}s', 'ok')
            r['wallet'] = WALLETS[uid]
            return self.out(200, r)
        except PermissionError as e: return self.out(402, {'err': str(e), 'wallet': WALLETS.get(uid)})
        except LookupError as e: return self.out(404, {'err': str(e)})
        except Exception as e:
            log(p, uid[:8], 'ERR', repr(e)[:300]); return self.out(500, {'err': str(e)[:200]})

    def log_message(self, *a): pass


if __name__ == '__main__':
    log('studio listening', PORT, TEXT_MODEL, IMAGE_MODEL)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
