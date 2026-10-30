#!/bin/zsh
# 重新生成数据并推送到 GitHub Pages（同一个仓库，不换链接）
set -e
cd "$(dirname "$0")"
python3 build_catalog.py
git add -A
git commit -m "${1:-更新}" || true
git -c credential.helper='!gh auth git-credential' push https://github.com/lyx1265897416-lab/realtime-drama-app.git main
