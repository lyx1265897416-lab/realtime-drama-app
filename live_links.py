#!/usr/bin/env python3
"""打印带实时配置的 APP 测试链接（中英各一条）。

读两个中转现在的公网隧道地址和口令，拼成 ?live=剧id~接口~口令。隧道重开地址会变，重开后重跑这个脚本发新链接。
口令只在链接里，不进仓库；APP 打开后会存到本机并从地址栏去掉。
用法：python3 live_links.py [--local]   （--local 用 127.0.0.1 的本机中转，给这台 Mac 自己测）
"""
import re, sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
APP = 'https://lyx1265897416-lab.github.io/realtime-drama-app/'
RELAYS = {  # 剧 id: (中转目录, 隧道日志或地址文件, 本机端口)
    'mii-open': (ROOT / 'projects/mii-takes-care-of-you/实时开放-vivix', 'tunnel.log', 8896),
    'magnus-third': (ROOT / 'output/magnus-third-live-v1', 'logs/tunnel-public.log', 8895),  # launchd 托管的公网实例（tools/realtime-relays）
    'studio': (ROOT / 'projects/realtime-drama-app/studio', 'tunnel.log', 8860),  # 创作服务：演员表、钱包、自由剧场
}
local = '--local' in sys.argv
parts = []
for did, (d, log, port) in RELAYS.items():
    k = (d / 'token.txt').read_text().strip()
    if local:
        api = f'http://127.0.0.1:{port}'
    else:
        urls = re.findall(r'https://[a-z0-9-]+\.trycloudflare\.com', (d / log).read_text(errors='ignore'))
        if not urls:
            print(f'! {did} 没找到隧道地址（{d / log}）', file=sys.stderr); continue
        api = urls[-1]
    parts.append(f'{did}~{api}~{k}')
base = 'http://localhost:8850/' if local else APP
live = quote(','.join(parts), safe='~,:/')
for lang in ('zh', 'en'):
    print(f'{lang}: {base}?lang={lang}&live={live}')
