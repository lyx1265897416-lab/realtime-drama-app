# Unscripted 即兴剧场 · realtime 互动剧集合 APP（网页预览版）

线上地址：https://lyx1265897416-lab.github.io/realtime-drama-app/ （`?lang=zh` / `?lang=en`，不带参数跟系统语言）

## 结构

- `catalog.json`：收录哪些剧（标题、简介、标签、视角、封面、用测试记录页的哪条成片和哪组测试）
- `build_catalog.py`：从 `../realtime-drama-test-log`（测试记录页）拼出 `docs/data/catalog.js`
- `docs/`：APP 本体（`index.html` + `app.css` + `app.js`），GitHub Pages 从这里发布
- 视频、海报、字幕都直接引用测试记录页的公开地址，本仓库不放媒体

## 页面

- 剧场：主推轮播（自动播各剧开场，docs/openings/，build_catalog.py 剪）、继续你的故事、开放式货架、预设剧情货架、怎么玩、编辑推荐、全部剧集筛选
- 推荐：竖滑流，每条是一幕真实生成的片段，可从这一幕开始互动
- 详情：幕表 / 事件簿 / 关于，开始或继续，实时开玩
- 播放器：分段进度条、双语字幕、右侧喜欢/事件簿/幕表/字幕；到选择点停下 → 选项 + 输入框 + 灵感 → 等待生成 → 播这一幕；事件簿可回到某一幕
- 在追 / 我的：进度、收藏、事件簿、语言、字幕、实时链接

## 实时开玩（APP 内直接生成）

- 咪开放式（8896）和第三视角（8895）已接进 APP 播放器：开场 → 中转给的 A/B 选项 + 输入框 → 导演层 + 两段并发生成 → 第 1 段按第 2 段出片倒推开播 → 两段接着播；咪的配音另播；每幕回报 `/api/round/<id>/view`
- 测试链接：`python3 live_links.py` 打印中英两条（链接里带 `?live=剧id~隧道地址~口令`，APP 存到本机后从地址栏去掉）；隧道重开地址会变，重跑脚本发新链接
- 第三视角中转的跨域白名单加了 Pages 和 localhost:8850（`mag_third_relay.py` 的 ORIGINS，改前备份 `mag_third_relay.before-app.py`）；咪的中转本来就允许任意来源
- 中转和隧道都由 launchd 托管（../../tools/realtime-relays/README.md）；这台 Mac 要开着

## 预览回放与实时开玩

- 没填实时链接时，选择点之后播的是测试时那一轮的真实生成结果；如果你说的和测试时不同，画面开头会注明当时的输入
- 「我的 → 实时链接」填入某部剧的实时测试链接（含口令，只存在本机浏览器），详情页出现红色实时按钮，在 APP 里嵌入那部剧自己的实时播放页

## 角色、演员表与自由剧场

方案见 [角色与演员表方案.md](角色与演员表方案.md)。

- 创作服务 `studio/studio_server.py`（8860，口令 studio/token.txt，数据 studio/data/，不进仓库）：AI 补全、提炼设定、定妆照、剧照、自由剧场写戏、上架、雇佣、星票钱包。模型走 OpenRouter
- 由 launchd 托管（com.vicky.realtime.studio、studio-tunnel，见 ../../tools/realtime-relays/README.md）。改完代码或演员表：`launchctl kickstart -k gui/$(id -u)/com.vicky.realtime.studio`；只重启服务时隧道地址不变，隧道重启或电脑重启后重跑 `live_links.py` 发新链接
- 演员种子：`python3 tools/seed_actors.py` 从 Vicky 资产库选角（`PICK` / `ROOKIE_GROUPS`），人设补充在 `tools/actor_bios.json`，图片引用资产库线上地址
- 串场：实时中转的 `/api/session` 接受可选的 `persona`（角色卡文本），导演层收到后按卡演；不带时行为不变

## 加新剧

1. 先把新剧的测试结果进测试记录页（`realtime-drama-test-log` 的 `dramas/<id>.json`，要有完整成片 films 和测试组 groups）
2. 在 `catalog.json` 的 `dramas` 里追加一条：`source.log` 写测试记录页的剧集 id，`source.film` / `source.group` 写成片标题和测试组标题里的一段文字
3. `python3 build_catalog.py`（会提示字幕输入和卡片对不上的轮次）
4. `./publish.sh "说明"`
