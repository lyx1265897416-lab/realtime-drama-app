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
- 详情：幕表（开放式叫「大家的演绎」，是案例参考）/ 事件簿 / 关于，实时开玩，预览回放
- 播放器：分段进度条、双语字幕、右侧喜欢/事件簿/幕表/字幕；到选择点停下 → 选项 + 输入框 + 灵感 → 等待生成 → 播这一幕；事件簿可回到某一幕
- 在追 / 我的：进度、收藏、事件簿、语言、字幕、实时链接

## 实时开玩（APP 内直接生成）

- 接进 APP 播放器的：Magnus 开放式（8890，MD-C，ultrafast）、Magnus 第三视角（8895）、Rafael（8901）、咪开放式（8896）。开场 → 中转给的 A/B 选项 + 输入框 → 导演层 + 两段并发生成 → 第 1 段按第 2 段出片倒推开播 → 两段接着播；咪的配音另播；每幕回报 `/api/round/<id>/view`（含 buffer、buffer_n：这一幕播放时卡了多久、几次）
- 两部预设剧情没接实时：它们的中转是人工接单的导演层，详情页只有「开始互动」预览
- 口令：`python3 live_links.py` 打印中英两条测试链接（`?live=剧id~隧道地址~口令`），APP 存到本机后从地址栏去掉。没存过口令时点「实时开玩」会让粘贴测试链接
- 地址：隧道重开地址会变，但不用换链接。launchd 服务 `app-relay-sync`（`tools/realtime-relays/app_relay_sync.py`）每分钟探一次隧道，把地址写进 `docs/relays.json` 并推送，APP 每次打开和连不上时都会重读；隧道域名失效时它还会自动重启隧道。这个文件只有地址，口令不进仓库
- 开场和待机片放在 `docs/live/`（540 宽、约 1 Mbps），不用原始的 720p 高码率版本；Vivix 实时片段是 720p 3–6 Mbps，改不了，所以开播前会等到缓冲够
- 中转和隧道都由 launchd 托管（../../tools/realtime-relays/README.md）；这台 Mac 要开着

## 性能约定

- 每帧或高频调用的函数（播放器 onTime、rt-player 的 paint）只在内容变化时才写页面
- 视频上面不用 filter、backdrop-filter：压暗用 `.p-shade::after` 的透明度
- 列表和卡片用小图：幕表 `docs/thumbs/`、封面 `docs/covers/thumb/`（`build_catalog.py` 生成），演员 `docs/actors/thumb/`（演员表改了跑 `tools/actor_thumbs.py`）
- 推荐流只保留当前和前后各一条的视频；轮播滚出屏幕就暂停
- 回放成片走分段（`docs/film/<id>/`，单文件 + 字节范围，`build_catalog.py` 从测试记录页成片转封装，不重新编码；Chrome 用 `docs/vendor/hls.light.min.js`，iPhone 用系统播放器，出错退回整部 mp4）。原因：这台 Mac 走 Shadowrocket，到 GitHub 只有约 1 Mbps，整站共用一条 HTTP/2 连接，整部 mp4 的数据压在连接上时离开页面要排队十几秒。不要再把长片直接放 `<video src>`；单个文件尽量不超过几 MB（Rafael 轮播片段因此只留前 30 秒）
- `docs/sw.js` 缓存同源的图片和脚本，页面本身先走网络，所以发布后打开就是新版；字体放 `docs/fonts/`，不依赖 Google

## 预览回放与实时开玩

- 开放式剧集：「预览回放」和「大家的演绎」里点任意一幕，都是连续播放案例成片（`#/play/<id>?watch=1&from=<幕>`），画面上显示案例用户的输入，带进度条；不再有假互动。没有实时链接时只能看案例，有实时链接时「开始」直接进实时
- 预设剧情：「开始互动」仍走选择点 + 模拟等待 + 播测试结果；点幕表某一幕是连续回放
- 「我的 → 实时链接」可以粘贴完整测试链接（含口令，只存在本机浏览器）

## 角色、演员表与自由剧场

方案见 [角色与演员表方案.md](角色与演员表方案.md)。

- 创作服务 `studio/studio_server.py`（8860，口令 studio/token.txt，数据 studio/data/，不进仓库）：AI 补全、提炼设定、定妆照、剧照、自由剧场写戏、上架、雇佣、星票钱包。模型走 OpenRouter
- 由 launchd 托管（com.vicky.realtime.studio、studio-tunnel，见 ../../tools/realtime-relays/README.md）。改完代码或演员表：`launchctl kickstart -k gui/$(id -u)/com.vicky.realtime.studio`；只重启服务时隧道地址不变，隧道重启或电脑重启后重跑 `live_links.py` 发新链接
- 演员种子：`python3 tools/seed_actors.py` 从 Vicky 资产库选角（`PICK` / `ROOKIE_GROUPS`），人设补充在 `tools/actor_bios.json`，图片引用资产库线上地址
- 串场：实时中转的 `/api/session` 接受可选的 `persona`（角色卡文本），导演层收到后按卡演；不带时行为不变

## 加新剧

1. 先把新剧的测试结果进测试记录页（`realtime-drama-test-log` 的 `dramas/<id>.json`，要有完整成片 films 和测试组 groups）
2. 在 `catalog.json` 的 `dramas` 里追加一条：`source.log` 写测试记录页的剧集 id，`source.film` / `source.group` 写成片标题和测试组标题里的一段文字
3. 封面放 `docs/covers/`（`cover_local`），再从封面裁一张方形脸部图放 `docs/covers/av/<id>.jpg`（`avatar`），圆形头像用它
4. `python3 build_catalog.py`（会提示字幕输入和卡片对不上的轮次）
5. `./publish.sh "说明"`
