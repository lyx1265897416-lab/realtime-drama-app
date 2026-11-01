// Unscripted 即兴剧场 · 预览版
// 剧集数据来自 data/catalog.js（build_catalog.py 从 realtime 测试记录页生成）。
// 没连实时中转时，“互动”走预览回放：在选择点停下 → 你点选项或打字 → 模拟生成等待 → 播测试时真实生成的那一幕。
(() => {
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const DATA = window.CATALOG, D = DATA.dramas, byId = Object.fromEntries(D.map(d => [d.id, d]));

// ---------- 本地存档（取不到也能正常用） ----------
const KEY = 'unscripted.v1';
let S = {progress: {}, liked: {}, saved: {}, chars: {}, stages: {}, casting: {}, settings: {lang: 'auto', subs: 'both', live: {}}};
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); S.settings = Object.assign({lang: 'auto', subs: 'both', live: {}}, S.settings); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
S.uid = S.uid || 'u' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);  // 演员表、钱包用的匿名身份
S.nick = S.nick || '旅人' + S.uid.slice(-4);
save();

// ---------- 语言 ----------
const Q = new URLSearchParams(location.search);
if (Q.get('lang')) S.settings.lang = Q.get('lang').startsWith('zh') ? 'zh' : 'en';
// 测试链接带实时配置：?live=mii-open~https://xxx.trycloudflare.com~口令,magnus-third~…（存到本机后从地址栏去掉，免得截图或转发带出口令）
if (Q.get('live')){
  Q.get('live').split(',').forEach(x => { const [id, api, k] = x.split('~'); if (id && api && k) S.settings.live[id] = {api: api.replace(/\/$/, ''), k}; });
  save(); Q.delete('live'); try { history.replaceState(null, '', location.pathname + (Q.toString() ? '?' + Q : '') + location.hash); } catch (e) {}
}
const lang = () => S.settings.lang === 'auto' ? (/^zh/i.test(navigator.language || '') ? 'zh' : 'en') : S.settings.lang;
const L = o => o == null ? '' : typeof o === 'string' ? o : (o[lang()] || o.zh || o.en || '');
const I = {
  tabHome: ['剧场', 'Theater'], tabFeed: ['推荐', 'For You'], tabCast: ['演员表', 'Cast'], tabLib: ['在追', 'My List'], tabMe: ['我的', 'Me'],
  deskNote: ['实时 AI 互动剧集合 · 网页预览版。每部剧只有开场是预制的（或预制剧情 + 选择点），之后你点选项或直接打字，他就会接着你的话演下去。', 'A home for live AI interactive dramas, web preview. Only the opening is pre-made; after that you pick or type, and the story is generated around what you said.'],
  deskLi1: ['没连实时中转时，互动走「预览回放」：播放测试时真实生成的那一幕', 'Without a live relay, scenes replay real generations from testing'],
  deskLi2: ['在「我的 → 实时链接」填入测试链接，就能在 APP 里直接实时开玩', 'Paste a test link in Me → Live links to play live in-app'],
  deskLi3: ['手机打开体验更好；加新剧只需改 catalog.json', 'Best on a phone. New dramas are one entry in catalog.json'],
  continue: ['继续你的故事', 'Continue your story'], continueSub: ['停在你上次开口的地方', 'Right where you last spoke'],
  all: ['全部', 'All'], open: ['开放式', 'Open'], preset: ['预设剧情', 'Pre-made'], romance: ['恋爱', 'Romance'], cozy: ['治愈', 'Cozy'], first: ['第一视角', 'First person'], third: ['第三视角', 'Third person'],
  shelfOpen: ['开放式 · 每一幕都由你决定', 'Open live · every scene is yours'], shelfOpenSub: ['只有开场是预制的，之后全部实时生成，没有固定结局', 'Only the opening is pre-made. No fixed ending.'],
  shelfPreset: ['预设剧情 · 关键时刻由你开口', 'Pre-made · you speak at key moments'], shelfPresetSub: ['完整剧集 + 选择点，选择点接实时生成', 'Full episodes with live-generated choice points'],
  allDramas: ['全部剧集', 'All dramas'], rank: ['编辑推荐', "Editor's picks"],
  howT: ['怎么玩', 'How it works'], howS: ['不是选 A 或 B 那么简单，你说什么，他就接什么', "It's not just A or B. Whatever you say, he answers."],
  how1: ['看开场', 'Watch the opening'], how1s: ['十几秒的预制开场，把你带进那一刻', 'A short pre-made opening drops you in'],
  how2: ['开口', 'Speak up'], how2s: ['点一个选项，或者直接打字对他说', 'Tap an option or type anything'],
  how3: ['他接着演', 'He plays it out'], how3s: ['AI 实时写下一幕并生成视频：回应你 → 演出来 → 留个钩子', 'AI writes and renders the next scene live: reply → act → hook'],
  start: ['开始互动', 'Start'], resume: ['继续第 {n} 幕', 'Resume scene {n}'], watch: ['看完整成片', 'Watch full cut'], live: ['实时开玩', 'Play live'],
  scenes: ['幕表', 'Scenes'], log: ['事件簿', 'Story log'], about: ['关于', 'About'],
  rounds: ['实时幕', 'Live scenes'], eps: ['预制集', 'Episodes'], waitMed: ['生成等待', 'Gen. wait'], endless: ['不设结局', 'No fixed end'],
  you: ['你', 'You'], youSaid: ['你说', 'You said'], scene: ['第 {n} 幕', 'Scene {n}'], opening: ['开场', 'Opening'],
  yourTurn: ['轮到你了', 'Your turn'], waitsYou: ['{name}在等你开口', '{name} is waiting for you'],
  sayPh: ['对{name}说点什么…', 'Say something to {name}…'], ideas: ['灵感', 'Ideas'],
  ideaReal: ['测试时她在这一幕说的', 'What she said here in testing'], ideaOther: ['测试时说过', 'Said in testing'],
  thinkRom: ['{name}在想怎么回答你', '{name} is deciding how to answer you'], thinkCozy: ['{name}歪着头，想了想', '{name} tilts its head and thinks'],
  step1: ['读懂你的话，写下一幕的分镜', 'Reading you, writing the next scene'], step2: ['两段视频同时生成 · {mode}', 'Rendering both parts at once · {mode}'], step3: ['缓冲好，连续播放', 'Buffered, playing straight through'],
  previewWait: ['预览回放 · 测试时这一幕等了 {s} 秒', 'Preview replay · this took {s}s live'], skip: ['跳过等待', 'Skip'],
  replayNote: ['预览回放：这一幕是测试时输入「{t}」的真实生成结果', 'Preview replay: real generation for the test input “{t}”'],
  previewChip: ['预览回放', 'Preview'], liveChip: ['实时', 'Live'],
  endOpen: ['故事还没完', 'To be continued'], endPreset: ['完', 'The end'], endSub: ['你开口 {a} 次，走过 {b} 幕', 'You spoke {a} times across {b} scenes'],
  again: ['从头再来', 'Play again'], more: ['看看别的剧', 'More dramas'], seeLog: ['翻翻事件簿', 'Open story log'],
  noLog: ['你还没开口过。<br>进入剧集，在选择点说一句话，这里就会记下你们的故事。', "You haven't spoken yet.<br>Say something at a choice point and your story is kept here."],
  backTo: ['回到这一幕', 'Rewind to here'], liked: ['喜欢', 'Like'], saveL: ['追剧', 'Save'], share: ['分享', 'Share'], cc: ['字幕', 'CC'],
  copied: ['链接已复制', 'Link copied'], savedT: ['已加入在追', 'Added to My List'], unsavedT: ['已移出在追', 'Removed'],
  libT: ['在追', 'My List'], libS: ['继续互动的剧和你收藏的剧', 'In progress and saved'], inProgress: ['互动中', 'In progress'], savedTab: ['收藏', 'Saved'],
  noLib: ['还没有在追的剧。去剧场挑一部开始吧。', 'Nothing here yet. Pick a drama in Theater.'], goTheater: ['去剧场', 'Go to Theater'],
  lastSaid: ['上次你说：', 'Last you said: '], notStarted: ['还没开始', 'Not started'],
  meName: ['即兴旅人', 'Wanderer'], meSub: ['你说的每一句，都会变成下一幕', 'Every line you say becomes the next scene'],
  stSaid: ['说过的话', 'Lines said'], stScenes: ['走过的幕', 'Scenes'], stSaved: ['在追', 'Saved'],
  myLog: ['我的事件簿', 'My story logs'], langL: ['语言', 'Language'], subsL: ['字幕', 'Subtitles'], liveL: ['实时链接', 'Live links'], aboutL: ['关于这个预览', 'About this preview'], clearL: ['清除本地记录', 'Clear local data'],
  general: ['通用', 'General'], dev: ['实时与开发', 'Live & dev'],
  subsBoth: ['中英双语', 'Bilingual'], subsEn: ['仅原声英文', 'English only'], langAuto: ['跟随系统', 'System'],
  liveHelp: ['粘贴这部剧的实时测试链接（含口令）。只存在这台设备上，不会上传。留空就用预览回放。', 'Paste this drama’s live test link (with key). Stored on this device only. Leave empty for preview replay.'],
  liveSaved: ['实时链接已保存', 'Live links saved'], saveBtn: ['保存', 'Save'], cleared: ['本地记录已清除', 'Cleared'],
  liveNone: ['还没填这部剧的实时链接，去「我的 → 实时链接」填一下', 'No live link yet. Add one in Me → Live links'],
  pov: ['视角', 'POV'], gen: ['生成方式', 'Generation'], tested: ['测试时间', 'Tested'], liveSt: ['实时', 'Live'], liveOn: ['已配置', 'Configured'], liveOff: ['未配置 · 预览回放', 'Not set · preview replay'],
  series: ['原版互动剧集', 'Original series'], soundOn: ['点一下画面打开声音', 'Tap to turn sound on'],
  fromHere: ['从这一幕开始互动', 'Play from this scene'], fromStart: ['从头开始', 'From the start'],
  hisLine: ['他回', 'He said'],
  liveStart: ['实时开玩', 'Play live'], previewBtn: ['预览回放', 'Preview'], liveConn: ['实时生成已连接', 'Live generation connected'], liveOff2: ['实时中转没连上，先用预览回放', 'Live relay offline, using preview replay'],
  liveBadKey: ['实时口令不对，请用最新的测试链接打开', 'Wrong live key, open the latest test link'], tapStart: ['点一下开始', 'Tap to start'],
  lStep1: ['读懂你的话，导演层在写下一幕', 'Reading you, writing the next scene'], lStep1o: ['读取这个选项预先写好的分镜', 'Loading the storyboard for this choice'],
  lStep2: ['两段视频同时生成{mode} · 已完成 {n}/2', 'Rendering both parts{mode} · {n}/2 ready'], lStep3: ['第 1 段好了，按第 2 段出片时间倒推开播', 'Part 1 ready, timing the start so both play through'],
  liveWaited: ['实时生成 · 已等 {s} 秒', 'Live · {s}s so far'], liveFail: ['这一幕没生成出来：{e}，可以再说一次', 'This scene failed: {e}. Try again'], lowBal: ['Vivix 余额不足，这一幕没生成', 'Vivix balance low, scene not generated'],
  liveDone: ['第 {n} 幕 · 发送到开播 {s} 秒', 'Scene {n} · {s}s from send to play'], restart: ['重新开始', 'Restart'], liveTag: ['实时', 'Live'], busyGen: ['上一幕还在生成', 'Still generating the last scene'], playing: ['正在播放', 'Now playing'], tapPause: ['轻点画面暂停 · 右侧可看幕表和事件簿', 'Tap to pause · scenes and story log on the right'],
};
const T = (k, vars) => { let s = (I[k] || [k, k])[lang() === 'zh' ? 0 : 1]; if (vars) for (const v in vars) s = s.replaceAll('{' + v + '}', vars[v]); return s; };
const applyStatic = () => { document.documentElement.lang = lang() === 'zh' ? 'zh-CN' : 'en'; $$('[data-i18n]').forEach(el => el.textContent = T(el.dataset.i18n)); };

// ---------- 小工具 ----------
const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 8.5 12 4l4.5 4.5M5 13v6h14v-6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.4-9.3-9.2C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8-1.8 4.8-9.3 9.2-9.3 9.2z"/></svg>',
  mark: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12a1 1 0 0 1 1 1v16.2l-7-4.4-7 4.4V4.5a1 1 0 0 1 1-1z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M4 5h16v3H4zM4 10.5h16v3H4zM4 16h16v3H4z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M5 3.5h10.5L19 7v13.5H5zM8 9h8v1.6H8zm0 3.5h8v1.6H8zm0 3.5h5v1.6H8z"/></svg>',
  shareF: '<svg viewBox="0 0 24 24"><path d="M14 4l7 7-7 7v-4.2c-5 0-8.4 1.6-11 5.2 1-5.2 4-10 11-11z"/></svg>',
  cc: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zm4.5 9.2c.6.5 1.3.8 2.2.8 1 0 1.8-.4 2.3-1l-1-.9c-.3.3-.7.5-1.2.5-.9 0-1.5-.7-1.5-1.6s.6-1.6 1.5-1.6c.5 0 .9.2 1.2.5l1-.9c-.5-.6-1.3-1-2.3-1-1.8 0-3 1.3-3 3 0 .9.3 1.6.8 2.2zm7 0c.6.5 1.3.8 2.2.8 1 0 1.8-.4 2.3-1l-1-.9c-.3.3-.7.5-1.2.5-.9 0-1.5-.7-1.5-1.6s.6-1.6 1.5-1.6c.5 0 .9.2 1.2.5l1-.9c-.5-.6-1.3-1-2.3-1-1.8 0-3 1.3-3 3 0 .9.3 1.6.8 2.2z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M3.4 20.6 21 12 3.4 3.4 3.4 10l12.6 2-12.6 2z"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5m0-5-5 5"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9V4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  live: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M7.2 16.8a6.8 6.8 0 0 1 0-9.6M16.8 7.2a6.8 6.8 0 0 1 0 9.6M4.4 19.6a10.7 10.7 0 0 1 0-15.2M19.6 4.4a10.7 10.7 0 0 1 0 15.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
let toastT;
function toast(msg){ const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2200); }
const rts = d => d.chapters.map((c, i) => Object.assign({i}, c)).filter(c => c.kind === 'rt');
const sceneNo = (d, i) => d.chapters.slice(0, i + 1).filter(c => c.kind === 'rt').length;
const hisLine = (d, ch) => d.cues.find(c => c.s >= (ch.resume || ch.start) - .1 && c.s < ch.end && c.who !== 'you');
const kindPill = d => d.kind === 'open' ? `<span class="pill live">LIVE</span>` : `<span class="pill gold">${T('preset')}</span>`;
const nm = d => lang() === 'zh' && d.name_zh ? d.name_zh : d.name;
const progOf = id => S.progress[id];
const parseLive = v => { if (!v) return null; if (typeof v === 'object') return v.api && v.k ? v : null;
  try { const u = new URL(v); const k = u.searchParams.get('k'); return k ? {api: (u.searchParams.get('api') || u.origin).replace(/\/$/, ''), k, url: v} : null; } catch (e) { return null; } };
const liveCfg = id => parseLive((S.settings.live || {})[id]);
const liveUrl = id => { const c = liveCfg(id); return c && (c.url || `${c.api}/?k=${encodeURIComponent(c.k)}`); };  // 没接进 APP 的剧：嵌入它自己的实时页
const liveNative = d => !!(d.live && liveCfg(d.id));
function shareLink(d){ const u = location.origin + location.pathname + '#/d/' + d.id; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast(T('copied')), () => toast(u)); }
function toggleSave(d){ S.saved[d.id] = S.saved[d.id] ? 0 : Date.now(); if (!S.saved[d.id]) delete S.saved[d.id]; save(); toast(T(S.saved[d.id] ? 'savedT' : 'unsavedT')); return !!S.saved[d.id]; }
function toggleLike(d){ S.liked[d.id] = !S.liked[d.id]; if (!S.liked[d.id]) delete S.liked[d.id]; save(); return !!S.liked[d.id]; }
const highlight = d => { const r = rts(d); const want = d.cover_round ? r[d.cover_round - 1] : r[Math.min(1, r.length - 1)]; return want || r[0]; };

// ---------- 底部弹层 ----------
function sheet(title, sub, body, onMount){
  const host = $('#sheetHost');
  host.innerHTML = `<div class="sheet-bg"></div><div class="sheet"><div class="grip"></div><div class="sheet-h"><b>${title}${sub ? `<span>${sub}</span>` : ''}</b><button class="iconbtn" data-x>✕</button></div><div class="sheet-b">${body}</div></div>`;
  const bg = $('.sheet-bg', host), sh = $('.sheet', host);
  requestAnimationFrame(() => { bg.classList.add('show'); sh.classList.add('show'); });
  const close = () => { bg.classList.remove('show'); sh.classList.remove('show'); setTimeout(() => { if (host.contains(sh)) host.innerHTML = ''; }, 380); };
  bg.onclick = close; $('[data-x]', host).onclick = close;
  onMount && onMount(sh, close);
  return close;
}
function scenesSheet(d, onPick){
  const p = progOf(d.id) || {};
  const body = d.chapters.map((c, i) => {
    if (c.kind === 'ep') return `<div class="scene" data-i="${i}">${epThumb(d, c)}<div><b>${esc(epLabel(c))}</b><p>${fmtDur(c.end - c.start)}</p></div></div>`;
    const h = hisLine(d, c), n = sceneNo(d, i), done = (p.done || []).includes(i);
    return `<div class="scene${done ? ' done' : ''}" data-i="${i}"><div class="n">${c.poster ? `<img src="${esc(c.poster)}" loading="lazy" alt="">` : ''}</div><div><b>${T('scene', {n})} <span class="pill live">LIVE</span></b><p><em>${T('youSaid')}：</em>${esc(L(c.said))}${h ? `<br>${esc(lang() === 'zh' && h.zh ? h.zh : h.en)}` : ''}</p></div></div>`;
  }).join('');
  return sheet(T('scenes'), esc(L(d.title)), body, (sh, close) => $$('.scene', sh).forEach(el => el.onclick = () => { close(); onPick(+el.dataset.i); }));
}
const epThumb = (d, c) => /Opening|开场/.test(c.label) ? `<div class="n"><img src="${esc(d.cover)}" alt=""></div>` : `<div class="n ep">${esc(c.label.replace(/[^\d]/g, ''))}</div>`;
const epLabel = c => /Opening|开场/.test(c.label) ? T('opening') : lang() === 'en' ? c.label.replace(/第\s*(\d+)\s*集/, 'Episode $1') : c.label;
const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function liveLogHtml(d){
  const items = (progOf(d.id) || {}).live || [];
  return items.map(x => `<div class="log-item"><small>${T('liveTag')} · ${T('scene', {n: x.n})} · ${new Date(x.at).toLocaleString(lang() === 'zh' ? 'zh-CN' : 'en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</small><div><span class="y">${esc(x.text)}</span></div>${x.en ? `<div class="h">“${esc(x.en)}”</div>` : ''}${x.zh && lang() === 'zh' ? `<div class="h2">${esc(x.zh)}</div>` : ''}</div>`).join('');
}
function logSheet(d, onRewind){
  const p = progOf(d.id) || {}, items = p.log || [];
  if (!items.length && (p.live || []).length) return sheet(T('log'), esc(L(d.title)), `<div class="log">${liveLogHtml(d)}</div>`);
  const body = items.length ? `<div class="log">${liveLogHtml(d)}${items.map(x => {
    const c = d.chapters[x.i], h = hisLine(d, c);
    return `<div class="log-item"><small>${T('scene', {n: sceneNo(d, x.i)})} · ${new Date(x.at).toLocaleString(lang() === 'zh' ? 'zh-CN' : 'en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</small><div><span class="y">${esc(x.text)}</span></div>${h ? `<div class="h">“${esc(h.en)}”</div>${h.zh && lang() === 'zh' ? `<div class="h2">${esc(h.zh)}</div>` : ''}` : ''}${onRewind ? `<button data-i="${x.i}">↺ ${T('backTo')}</button>` : ''}</div>`;
  }).join('')}</div>` : `<div class="empty">${T('noLog')}</div>`;
  return sheet(T('log'), esc(L(d.title)), body, (sh, close) => $$('.log-item button', sh).forEach(b => b.onclick = () => { close(); onRewind(+b.dataset.i); }));
}

// ---------- 路由 ----------
let cleanup = [];
const onLeave = f => cleanup.push(f);
function route(){
  cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = [];
  $('#sheetHost').innerHTML = '';
  const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const parts = path.split('/'); const q = new URLSearchParams(qs || '');
  document.body.className = '';
  const view = $('#view'); view.scrollTop = 0;
  const tab = {'': 'home', feed: 'feed', cast: 'cast', library: 'library', me: 'me'}[parts[0]] || '';
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  if (parts[0] === 'feed') return Feed(view);
  if (parts[0] === 'library') return Library(view);
  if (parts[0] === 'me') return Me(view);
  if (parts[0] === 'cast') return Cast(view);
  if (parts[0] === 'actor') return Actor(view, decodeURIComponent(parts[1] || ''));
  if (parts[0] === 'char') return Editor(view, parts[1] || 'new');
  if (parts[0] === 'stage') return parts[1] === 'new' ? StageNew(view, q) : parts[1] ? StagePlay(view, parts[1]) : Stages(view);
  if (parts[0] === 'd' && byId[parts[1]]) return Detail(view, byId[parts[1]]);
  if (parts[0] === 'play' && byId[parts[1]]) return q.get('live') === '1' && liveNative(byId[parts[1]]) ? LivePlayer(view, byId[parts[1]]) : Player(view, byId[parts[1]], q);
  if (parts[0] === 'live' && byId[parts[1]]) return Live(view, byId[parts[1]]);
  return Home(view);
}
addEventListener('hashchange', route);

// ---------- 剧场（首页） ----------
function Home(view){
  const heroes = [...D].sort((a, b) => (a.kind === 'open' ? 0 : 1) - (b.kind === 'open' ? 0 : 1));
  const going = D.filter(d => progOf(d.id) && progOf(d.id).i != null).sort((a, b) => progOf(b.id).at - progOf(a.id).at);
  const filters = ['all', 'open', 'preset', 'romance', 'cozy', 'first', 'third'];
  view.innerHTML = `
  <header class="topbar"><div class="brand">Unscripted<small>${lang() === 'zh' ? '即兴剧场' : 'LIVE DRAMA'}</small></div>
    <button class="iconbtn" id="langBtn" title="Language">${ICON.globe}</button></header>
  <section class="hero" id="hero"><div class="hero-track">${heroes.map(d => `
    <div class="hero-slide" data-id="${d.id}"><img src="${esc(d.cover)}" alt=""><video muted playsinline preload="none" data-src="${esc(d.opening)}"></video>
      <div class="hero-info"><div class="pills">${kindPill(d)}<span class="pill">${esc(L(d.badge))}</span></div>
        <h3>${esc(L(d.title))}</h3><div class="lead">${esc(L(d.lead))}</div><p>${esc(L(d.hook))}</p>
        <button class="btn gold" data-play="${d.id}">${ICON.play}${T('start')}</button></div></div>`).join('')}</div>
    <div class="hero-dots">${heroes.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div></section>
  ${going.length ? `<section class="sec"><div class="sec-h"><div><h2>${T('continue')}</h2><p>${T('continueSub')}</p></div></div>
    <div class="scroller">${going.map(d => { const p = progOf(d.id), last = (p.log || []).slice(-1)[0]; const pct = Math.round(100 * (p.done || []).length / d.rounds);
      return `<div class="cont" data-id="${d.id}" data-cont><img src="${esc(d.cover)}" alt=""><div><b>${esc(L(d.title))}</b><div class="said">${last ? T('lastSaid') + esc(last.text) : T('scene', {n: Math.max(1, sceneNo(d, p.i))})}</div><div class="bar"><i style="width:${pct}%"></i></div></div></div>`; }).join('')}</div></section>` : ''}
  <section class="sec"><div class="sec-h"><div><h2>${T('shelfOpen')}</h2><p>${T('shelfOpenSub')}</p></div></div>
    <div class="scroller">${D.filter(d => d.kind === 'open').map(pcard).join('')}</div></section>
  <section class="sec"><div class="sec-h"><div><h2>${T('shelfPreset')}</h2><p>${T('shelfPresetSub')}</p></div></div>
    <div class="scroller">${D.filter(d => d.kind === 'preset').map(pcard).join('')}</div></section>
  <section class="sec"><div class="castbanner" data-go-cast><div class="avs">${ACT.slice(0, 4).map(a => `<img src="${esc(a.face)}" alt="">`).join('')}</div><div><b>${Z('带上你的角色串场', 'Bring your own character')}</b><span>${Z('创建或签下一个角色，带 TA 演任何一部剧；也能上架让别人雇 TA', 'Create or sign a character, take them into any drama, or list them for hire')}</span></div><span class="go">›</span></div></section>
  <section class="sec"><div class="how"><h3>${T('howT')}</h3><p>${T('howS')}</p><ol>
    <li><i>1</i><div>${T('how1')}<small>${T('how1s')}</small></div></li><li><i>2</i><div>${T('how2')}<small>${T('how2s')}</small></div></li><li><i>3</i><div>${T('how3')}<small>${T('how3s')}</small></div></li></ol></div></section>
  <section class="sec"><div class="sec-h"><h2>${T('rank')}</h2></div><div class="rank">${D.map((d, i) => `
    <div class="rank-item" data-id="${d.id}"><div class="no">${i + 1}</div><img src="${esc(d.cover)}" alt="" loading="lazy"><div><b>${esc(L(d.title))}</b><span>${esc(L(d.lead))}</span><span>${d.kind === 'open' ? T('endless') : d.episodes + ' ' + T('eps')} · ${d.rounds} ${T('rounds')}${d.wait_median ? ' · ' + T('waitMed') + ' ' + Math.round(d.wait_median) + 's' : ''}</span></div></div>`).join('')}</div></section>
  <section class="sec"><div class="sec-h"><h2>${T('allDramas')}</h2></div>
    <div class="chips" id="chips">${filters.map((f, i) => `<button class="chip${i ? '' : ' on'}" data-f="${f}">${T(f)}</button>`).join('')}</div>
    <div class="grid" id="grid" style="margin-top:14px"></div></section>`;
  const grid = $('#grid');
  const fill = f => grid.innerHTML = D.filter(d => f === 'all' || d.kind === f || d.genre === f || d.pov === f).map(pcard).join('');
  fill('all');
  $('#chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip').forEach(x => x.classList.toggle('on', x === b)); fill(b.dataset.f); };
  view.onclick = e => {
    if (e.target.closest('[data-go-cast]')){ location.hash = '#/cast'; return; }
    const p = e.target.closest('[data-play]'); if (p){ e.stopPropagation(); location.hash = '#/play/' + p.dataset.play; return; }
    const c = e.target.closest('[data-cont]'); if (c){ location.hash = '#/play/' + c.dataset.id + '?resume=1'; return; }
    const card = e.target.closest('[data-id]'); if (card) location.hash = '#/d/' + card.dataset.id;
  };
  $('#langBtn').onclick = e => { e.stopPropagation(); S.settings.lang = lang() === 'zh' ? 'en' : 'zh'; save(); applyStatic(); route(); };
  // 轮播：自动切换 + 拖动；只给当前这张加载片段
  const hero = $('#hero'), track = $('.hero-track', hero), slides = $$('.hero-slide', hero), dots = $$('.hero-dots i', hero);
  let k = 0, timer;
  const go = n => { k = (n + slides.length) % slides.length; track.style.transform = `translateX(${-100 * k}%)`; dots.forEach((d, i) => d.classList.toggle('on', i === k));
    slides.forEach((s, i) => { const v = $('video', s); if (i === k && v.dataset.src){ if (!v.src) { v.src = v.dataset.src; v.oncanplay = () => v.classList.add('ready'); } v.onended = () => go(k + 1); v.currentTime = 0; v.play().catch(() => {}); } else v.pause(); });
    clearTimeout(timer); timer = setTimeout(() => { const v = $('video', slides[k]); if (v.paused || v.readyState < 2) go(k + 1); }, 10000); };  // 开场播完才切下一部；10 秒还没播起来就先跳过
  let x0 = null, dragged = false;
  hero.addEventListener('pointerdown', e => { x0 = e.clientX; dragged = false; });
  hero.addEventListener('pointerup', e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40){ dragged = true; go(k + (dx < 0 ? 1 : -1)); } });
  hero.addEventListener('click', e => { if (dragged){ e.stopPropagation(); dragged = false; } }, true);
  go(0); onLeave(() => { clearTimeout(timer); slides.forEach(s => { const v = $('video', s); v.pause(); v.removeAttribute('src'); v.load(); }); view.onclick = null; });
}
function pcard(d){
  return `<div class="pcard" data-id="${d.id}"><div class="pic"><img src="${esc(d.cover)}" alt="" loading="lazy">${kindPill(d)}<div class="meta">${d.kind === 'open' ? `${d.rounds}+ ${T('rounds')}` : `${d.episodes} ${T('eps')} · ${d.rounds} ${T('rounds')}`}</div></div><b>${esc(L(d.title))}</b><span>${esc(L(d.lead))}</span></div>`;
}

// ---------- 推荐（竖滑） ----------
function Feed(view){
  document.body.classList.add('noscroll', 'feed-on');
  const items = [];
  const per = D.map(d => { const r = rts(d); const h = highlight(d); const pick = [h, r[Math.floor(r.length * .6)]].filter((x, i, a) => x && a.indexOf(x) === i); return pick.map(c => ({d, c})); });
  for (let i = 0; i < 3; i++) per.forEach(list => list[i] && items.push(list[i]));
  let muted = false;  // 默认开声音；浏览器不让有声自动播放时先静音播，第一次点画面就打开
  view.innerHTML = `<div class="feed" id="feed">${items.map(({d, c}, k) => { const h = hisLine(d, c);
    return `<section class="fitem" data-k="${k}"><img src="${esc(c.poster)}" alt=""><video playsinline loop muted preload="none" data-src="${esc(c.clip)}" poster="${esc(c.poster)}"></video>
    <div class="f-info"><div class="who">@${esc(L(d.title))}</div>
      <div class="said"><em>${T('you')}</em>${esc(L(c.said))}</div>
      ${h ? `<div class="line">“${esc(h.en)}”</div>` : ''}
      <div class="tags">${d.tags.map(t => '#' + esc(L(t))).join(' ')}</div>
      <button class="btn gold" data-from="${c.i}" data-id="${d.id}">${ICON.play}${T('fromHere')}</button></div>
    <div class="rail"><button class="av-btn" data-go="${d.id}"><div class="av"><img src="${esc(d.cover)}" alt=""></div></button>
      <button class="like${S.liked[d.id] ? ' on' : ''}" data-like="${d.id}">${ICON.heart}<span>${T('liked')}</span></button>
      <button class="save${S.saved[d.id] ? ' on' : ''}" data-save="${d.id}">${ICON.mark}<span>${T('saveL')}</span></button>
      <button data-scenes="${d.id}">${ICON.list}<span>${T('scenes')}</span></button>
      <button data-share="${d.id}">${ICON.shareF}<span>${T('share')}</span></button></div></section>`; }).join('')}</div>
    <div class="feed-top"><span>${T('tabHome')}</span><b>${T('tabFeed')}</b></div>
`;
  const feed = $('#feed'), vids = $$('video', feed);
  const io = new IntersectionObserver(es => es.forEach(e => { const v = $('video', e.target);
    if (e.isIntersecting){ if (!v.src) v.src = v.dataset.src; v.muted = muted; v.play().catch(() => { muted = true; v.muted = true; v.play().catch(() => {}); }); } else v.pause(); }), {root: feed, threshold: .6});
  $$('.fitem', feed).forEach(s => io.observe(s));
  feed.onclick = e => {
    if (muted){ muted = false; vids.forEach(v => v.muted = false); if (!e.target.closest('button')) return; }
    const b = e.target.closest('button'); if (!b){ const v = e.target.closest('.fitem') && $('video', e.target.closest('.fitem')); if (v){ v.paused ? v.play() : v.pause(); } return; }
    if (b.dataset.from) location.hash = `#/play/${b.dataset.id}?from=${b.dataset.from}`;
    else if (b.dataset.go) location.hash = '#/d/' + b.dataset.go;
    else if (b.dataset.like){ const on = toggleLike(byId[b.dataset.like]); $$(`[data-like="${b.dataset.like}"]`).forEach(x => x.classList.toggle('on', on)); }
    else if (b.dataset.save){ const on = toggleSave(byId[b.dataset.save]); $$(`[data-save="${b.dataset.save}"]`).forEach(x => x.classList.toggle('on', on)); }
    else if (b.dataset.scenes){ const d = byId[b.dataset.scenes]; scenesSheet(d, i => location.hash = `#/play/${d.id}?from=${i}`); }
    else if (b.dataset.share) shareLink(byId[b.dataset.share]);
  };
  onLeave(() => { io.disconnect(); vids.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); }); });
}

// ---------- 剧集详情 ----------
function Detail(view, d){
  document.body.classList.add('notabs');
  const p = progOf(d.id), r = rts(d);
  const resumeN = p && p.i != null ? Math.max(1, sceneNo(d, p.i)) : 0;
  view.innerHTML = `<div class="detail fade-in"><div class="d-bg"><img src="${esc(d.cover)}" alt=""></div>
    <div class="d-top"><button class="iconbtn" id="back">${ICON.back}</button><div class="row"><button class="iconbtn" id="shareBtn">${ICON.share}</button></div></div>
    <div class="d-head" style="margin-top:-60px"><div class="pills">${kindPill(d)}<span class="pill">${esc(L(d.badge))}</span><span class="pill">${T(d.pov)}</span></div>
      <h1>${esc(L(d.title))}</h1><div class="lead">${esc(L(d.lead))}</div>
      <div class="d-stats"><div><b>${d.kind === 'open' ? '∞' : d.episodes}</b><span>${d.kind === 'open' ? T('endless') : T('eps')}</span></div><div><b>${d.rounds}</b><span>${T('rounds')}</span></div><div><b>${d.wait_median ? Math.round(d.wait_median) + 's' : '—'}</b><span>${T('waitMed')}</span></div></div>
      <p class="d-hook">${esc(L(d.hook))}</p><div class="d-tags">${d.tags.map(t => `<span>#${esc(L(t))}</span>`).join('')}</div></div>
    <div class="tabsw" id="dtabs"><button class="on" data-t="scenes">${T('scenes')}</button><button data-t="log">${T('log')}</button><button data-t="about">${T('about')}</button></div>
    <div class="d-pane" id="pane"></div>
    ${d.kind === 'open' ? `<div class="castrow" id="castRow">${(() => { const a = castingOf(d.id); return `${a ? avatar(a) : '<span class="av blank">∅</span>'}<span><small>${Z('出演身份', 'Playing as')}</small><b>${esc(a ? a.name : Z('空白的你', 'Blank you'))}</b></span><em>${Z('更换', 'Change')} ›</em>`; })()}</div>` : ''}
    <div class="d-cta">${liveNative(d) ? `<button class="btn live" id="goLive">${ICON.live}${T('liveStart')}</button><button class="btn ghost txt" id="go">${T('previewBtn')}</button>` : `<button class="btn gold" id="go">${ICON.play}${resumeN ? T('resume', {n: resumeN}) : T('start')}</button>`}
      <button class="btn ghost" id="saveBtn" title="${T('saveL')}" style="color:${S.saved[d.id] ? 'var(--gold)' : 'inherit'}">${ICON.mark}</button>
      ${!d.live && liveUrl(d.id) ? `<button class="btn ghost" id="liveBtn" title="${T('live')}" style="color:var(--live)">${ICON.live}</button>` : ''}</div></div>`;
  $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/');
  $('#shareBtn').onclick = () => shareLink(d);
  const top = $('.d-top'); view.onscroll = () => top.classList.toggle('solid', view.scrollTop > 330); onLeave(() => view.onscroll = null);
  $('#go').onclick = () => location.hash = `#/play/${d.id}${resumeN ? '?resume=1' : ''}`;
  $('#saveBtn').onclick = () => { const on = toggleSave(d); $('#saveBtn').style.color = on ? 'var(--gold)' : 'inherit'; };
  if ($('#liveBtn')) $('#liveBtn').onclick = () => location.hash = '#/live/' + d.id;
  if ($('#castRow')) $('#castRow').onclick = () => personaSheet(d.id, L(d.title), () => route());
  if ($('#goLive')){
    $('#goLive').onclick = () => location.hash = `#/play/${d.id}?live=1`;
    const c = liveCfg(d.id);  // 先探一下中转：没开就提示，主按钮退回预览回放
    fetch(`${c.api}/api/ping?k=${encodeURIComponent(c.k)}`).then(r => r.json()).then(j => { if (!j.ok){ toast(T('liveBadKey')); $('#goLive').disabled = true; $('#goLive').style.opacity = .45; } })
      .catch(() => { toast(T('liveOff2')); const b = $('#goLive'); if (b){ b.disabled = true; b.style.opacity = .45; } });
  }
  const pane = $('#pane');
  const show = t => {
    $$('#dtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    if (t === 'scenes'){
      const done = (p && p.done) || [];
      pane.innerHTML = d.chapters.map((c, i) => c.kind === 'ep'
        ? `<div class="scene" data-i="${i}">${epThumb(d, c)}<div><b>${esc(epLabel(c))}</b><p>${fmtDur(c.end - c.start)}</p></div></div>`
        : (() => { const h = hisLine(d, c); return `<div class="scene${done.includes(i) ? ' done' : ''}" data-i="${i}"><div class="n">${c.poster ? `<img src="${esc(c.poster)}" loading="lazy" alt="">` : ''}</div><div><b>${T('scene', {n: sceneNo(d, i)})} <span class="pill live">LIVE</span></b><p><em>${T('youSaid')}：</em>${esc(L(c.said))}${h ? '<br>' + esc(lang() === 'zh' && h.zh ? h.zh : h.en) : ''}</p></div></div>`; })()).join('');
      $$('.scene', pane).forEach(el => el.onclick = () => location.hash = `#/play/${d.id}?from=${el.dataset.i}`);
    } else if (t === 'log'){
      const items = (p && p.log) || [];
      pane.innerHTML = items.length || (p && (p.live || []).length) ? `<div class="log">${liveLogHtml(d)}${items.map(x => { const c = d.chapters[x.i], h = hisLine(d, c); return `<div class="log-item"><small>${T('scene', {n: sceneNo(d, x.i)})}</small><div><span class="y">${esc(x.text)}</span></div>${h ? `<div class="h">“${esc(h.en)}”</div>${lang() === 'zh' && h.zh ? `<div class="h2">${esc(h.zh)}</div>` : ''}` : ''}<button data-i="${x.i}">↺ ${T('backTo')}</button></div>`; }).join('')}</div>` : `<div class="empty">${T('noLog')}</div>`;
      $$('.log-item button', pane).forEach(b => b.onclick = () => location.hash = `#/play/${d.id}?from=${b.dataset.i}`);
    } else {
      const face = (r[0] && r[0].poster) || d.cover;
      pane.innerHTML = `<div class="charcard"><img src="${esc(face)}" alt=""><div><b>${esc(L(d.lead))}</b><p>${esc(L(d.hook))}</p></div></div>
        <dl class="kv"><dt>${T('pov')}</dt><dd>${T(d.pov)}</dd><dt>${T('gen')}</dt><dd>${esc(d.film.mode.replace('MD-C · ', ''))} · Vivix W1</dd><dt>${T('tested')}</dt><dd>${esc(d.tested)}</dd>
        <dt>${T('liveSt')}</dt><dd>${liveUrl(d.id) ? T('liveOn') : T('liveOff')}</dd></dl>
        <div class="row" style="margin-top:18px;flex-wrap:wrap"><button class="btn ghost" id="watchBtn" style="height:40px;font-size:13.5px">${T('watch')}</button>
        <button class="btn ghost" id="liveBtn2" style="height:40px;font-size:13.5px">${ICON.live}${T('live')}</button>
        ${d.series_url ? `<a class="btn ghost" href="${esc(d.series_url)}" target="_blank" rel="noopener" style="height:40px;font-size:13.5px">${T('series')} ↗</a>` : ''}</div>`;
      $('#watchBtn').onclick = () => location.hash = `#/play/${d.id}?watch=1`;
      $('#liveBtn2').onclick = () => liveNative(d) ? location.hash = `#/play/${d.id}?live=1` : liveUrl(d.id) ? location.hash = '#/live/' + d.id : toast(T('liveNone'));
    }
  };
  $('#dtabs').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); };
  show('scenes');
}

// ---------- 播放器 ----------
function Player(view, d, q){
  document.body.classList.add('notabs', 'noscroll');
  const watch = q.get('watch') === '1';
  const P = S.progress[d.id] = S.progress[d.id] || {log: [], done: []};
  let from = q.has('from') ? +q.get('from') : q.get('resume') === '1' && P.i != null ? P.i : 0;
  const answered = new Set();  // 这一次播放里已经开过口的幕
  const total = d.film.duration;
  view.innerHTML = `<div class="player" id="pl">
    <video id="v" playsinline preload="auto" poster="${esc(d.cover)}" src="${esc(d.film.video)}"></video>
    <div class="p-shade"></div><div class="p-tap" id="tap"></div>
    <div class="p-paused" id="paused" hidden>${ICON.play}</div>
    <div class="p-top"><div class="segbar" id="seg">${d.chapters.map(c => `<i class="${c.kind}" style="flex:${(c.end - c.start).toFixed(1)}"><b></b></i>`).join('')}</div>
      <div class="p-title"><button class="iconbtn" id="back">${ICON.back}</button><div><b>${esc(L(d.title))}</b><span id="chLabel"></span></div>
      <span class="pill ${watch ? '' : 'gold'} p-mode">${watch ? T('watch') : T('previewChip')}</span></div></div>
    <div class="rail p-rail"><button class="like${S.liked[d.id] ? ' on' : ''}" id="rLike">${ICON.heart}<span>${T('liked')}</span></button>
      <button id="rLog">${ICON.book}<span>${T('log')}</span></button><button id="rScenes">${ICON.list}<span>${T('scenes')}</span></button>
      <button id="rCC">${ICON.cc}<span>${S.settings.subs === 'en' ? 'EN' : (lang() === 'zh' ? '中/EN' : 'EN/中')}</span></button></div>
    <div class="subs" id="subs"></div>
    <div class="p-hint" id="hint">${T('tapPause')}</div>
    <div class="wait" id="wait"></div>
    <div class="choice" id="choice"></div></div>`;
  const pl = $('#pl'), v = $('#v'), subs = $('#subs'), choice = $('#choice'), wait = $('#wait');
  const bars = $$('#seg i b'), chLabel = $('#chLabel');
  let mode = 'play', curCh = -1, waitTimer = [];
  const setMode = m => { mode = m; pl.classList.toggle('choosing', m === 'choose'); pl.classList.toggle('waiting', m === 'wait'); };
  const chAt = t => { let k = 0; d.chapters.forEach((c, i) => { if (t >= c.start - .01) k = i; }); return k; };
  setTimeout(() => $('#hint') && ($('#hint').hidden = true), 4000);

  // 字幕
  const subsMode = () => S.settings.subs;
  function showSub(c){
    if (!c){ subs.innerHTML = ''; return; }
    subs.className = 'subs' + (c.who === 'you' ? ' you' : '') + (subsMode() === 'en' ? ' lang-en' : '');
    const who = c.who === 'you' ? (castingOf(d.id) ? castingOf(d.id).name : T('you')) : c.sp === 'Her' ? (castingOf(d.id) ? castingOf(d.id).name : Z('她', 'Her')) : c.sp && c.sp !== d.name ? c.sp : nm(d);
    subs.innerHTML = `<div class="who">${esc(who)}</div>${c.en ? `<div class="en">${esc(c.en)}</div>` : ''}${c.zh ? `<div class="zh">${esc(c.zh)}</div>` : ''}`;
  }
  let note = null;  // 预览回放说明，播放这一幕开头几秒显示

  function onTime(){
    const t = v.currentTime;
    d.chapters.forEach((c, i) => { bars[i].style.width = Math.max(0, Math.min(100, (t - c.start) / (c.end - c.start) * 100)) + '%'; });
    const k = chAt(t);
    if (k !== curCh){ curCh = k; const c = d.chapters[k]; chLabel.textContent = c.kind === 'rt' ? T('scene', {n: sceneNo(d, k)}) + ' · LIVE' : epLabel(c);
      P.i = k; P.at = Date.now(); save(); }
    // 到选择点：停下等她开口（完整成片模式不停）
    if (!watch && mode === 'play'){
      const nx = d.chapters.findIndex((c, i) => c.kind === 'rt' && !answered.has(i) && t >= c.pause && t < c.resume + .3);
      if (nx >= 0){ v.pause(); v.currentTime = d.chapters[nx].pause; openChoice(nx); return; }
    }
    if (note && t < note.until){ subs.className = 'subs you'; subs.innerHTML = `<div class="zh" style="font-size:12px;color:#d8cbd9">${esc(note.text)}</div>`; return; }
    note = null;
    showSub(mode === 'play' ? d.cues.find(c => t >= c.s && t <= c.e) : null);
  }
  v.addEventListener('timeupdate', onTime);
  let raf; const loop = () => { if (mode === 'play' && !v.paused) onTime(); raf = requestAnimationFrame(loop); }; loop();

  function play(){ const pr = v.play(); if (pr) pr.catch(() => { v.muted = true; v.play().catch(() => {}); toast(T('soundOn')); }); $('#paused').hidden = true; }
  $('#tap').onclick = () => { if (mode !== 'play') return; if (v.muted){ v.muted = false; return; } if (v.paused){ play(); } else { v.pause(); $('#paused').hidden = false; } };

  // 选择点
  function openChoice(i){
    const c = d.chapters[i]; setMode('choose'); showSub(null); $('#hint').hidden = true; chLabel.textContent = T('scene', {n: sceneNo(d, i)}) + ' · LIVE'; P.i = i; P.at = Date.now(); save();
    const name = nm(d);
    const others = rts(d).filter(x => x.i !== i).map(x => L(x.said)).filter(Boolean);
    const extra = others.sort(() => Math.random() - .5).slice(0, 2);
    const opts = c.options || [];
    choice.innerHTML = `<div class="cue"><b>${T('scene', {n: sceneNo(d, i)})} · ${T('yourTurn')}</b>${T('waitsYou', {name})}</div>
      ${opts.map((o, k) => `<button class="opt" data-say="${esc(o)}"><i>${'AB'[k]}</i>${esc(o)}</button>`).join('')}
      <form class="say" id="sayF"><div class="inbox"><input id="sayIn" maxlength="120" autocomplete="off" placeholder="${esc(T('sayPh', {name}))}"><button type="button" class="bulb" id="bulb" title="${T('ideas')}">${ICON.bulb}</button></div><button class="send" type="submit">${ICON.send}</button></form>
      <div class="ideas" id="ideas"${opts.length ? ' hidden' : ''}><button data-say="${esc(L(c.said))}"><small>${T('ideaReal')}</small>${esc(L(c.said))}</button>${extra.map(x => `<button data-say="${esc(x)}"><small>${T('ideaOther')}</small>${esc(x)}</button>`).join('')}</div>`;
    requestAnimationFrame(() => { choice.classList.add('show'); subs.style.bottom = (choice.offsetHeight + 8) + 'px'; });
    $('#bulb').onclick = () => { $('#ideas').hidden = !$('#ideas').hidden; subs.style.bottom = (choice.offsetHeight + 8) + 'px'; };
    $$('[data-say]', choice).forEach(b => b.onclick = () => answer(i, b.dataset.say));
    $('#sayF').onsubmit = e => { e.preventDefault(); const t = $('#sayIn').value.trim(); if (t) answer(i, t); else $('#sayIn').focus(); };
  }
  function closeChoice(){ choice.classList.remove('show'); subs.style.bottom = ''; }

  // 开口 → 等待生成 → 播这一幕
  function answer(i, text){
    const c = d.chapters[i]; closeChoice(); setMode('wait'); answered.add(i);
    P.log = (P.log || []).filter(x => x.i !== i).concat([{i, text, at: Date.now()}]).sort((a, b) => a.i - b.i);
    P.done = [...new Set([...(P.done || []), i])]; P.i = i; P.at = Date.now(); save();
    const live = d.film.mode.replace(/^MD-[ABC] · /, '').replace('15 秒整段', '15s').replace('+', 's + ') + (/\d$/.test(d.film.mode) ? 's' : '');
    const real = L(c.said), same = text.trim() === real.trim() || text.trim() === (c.said.zh || '').trim() || text.trim() === (c.said.en || '').trim();
    wait.innerHTML = `<div class="bubble">${esc(text)}</div>
      <h4>${T(d.genre === 'cozy' ? 'thinkCozy' : 'thinkRom', {name: nm(d)})}</h4><div class="dots"><i></i><i></i><i></i></div>
      <div class="steps" id="steps"><div><i></i>${T('step1')}</div><div><i></i>${T('step2', {mode: live})}</div><div><i></i>${T('step3')}</div></div>
      <div class="meta"><span>${c.wait ? T('previewWait', {s: c.wait.toFixed(1)}) : T('previewChip')}</span><button id="skip">${T('skip')}</button></div>`;
    const st = $$('#steps div'); const mark = n => st.forEach((el, k) => { el.className = k < n ? 'ok' : k === n ? 'now' : ''; });
    mark(0); v.currentTime = c.resume; v.load && 0;
    const done = () => { waitTimer.forEach(clearTimeout); waitTimer = []; mark(3); setTimeout(() => { setMode('play'); note = same ? null : {text: T('replayNote', {t: real}), until: c.resume + 3.2}; v.currentTime = c.resume; play(); }, 250); };
    waitTimer = [setTimeout(() => mark(1), 1500), setTimeout(() => mark(2), 4300), setTimeout(done, 5400)];
    $('#skip').onclick = done;
  }

  // 结束
  v.addEventListener('ended', () => {
    setMode('end'); showSub(null); P.i = null; save();
    const card = document.createElement('div'); card.className = 'endcard fade-in';
    const other = D.find(x => x.id !== d.id && x.genre === d.genre) || D.find(x => x.id !== d.id);
    card.innerHTML = `<h3>${T(d.kind === 'open' ? 'endOpen' : 'endPreset')}</h3><p>${T('endSub', {a: answered.size, b: (P.done || []).length})}</p>
      <div class="pcard" data-id="${other.id}" style="width:auto;display:flex;gap:12px;align-items:center"><div class="pic" style="width:70px;height:96px;flex:none"><img src="${esc(other.cover)}" alt=""></div><div><span>${T('more')}</span><b>${esc(L(other.title))}</b></div></div>
      <div class="row"><button class="btn ghost" id="eLog">${T('seeLog')}</button><button class="btn gold" id="eAgain">${T('again')}</button></div>`;
    pl.appendChild(card);
    $('#eAgain').onclick = () => { location.hash = `#/play/${d.id}?from=0&t=${Date.now()}`; };
    $('#eLog').onclick = () => logSheet(d, rewind);
    $('.pcard', card).onclick = () => location.hash = '#/d/' + other.id;
  });

  const rewind = i => { const c = d.chapters[i]; [...answered].forEach(k => { if (k >= i) answered.delete(k); }); closeChoice(); waitTimer.forEach(clearTimeout); setMode('play'); const end = $('.endcard', pl); end && end.remove();
    if (c.kind === 'rt' && !watch){ v.currentTime = c.pause; v.pause(); openChoice(i); } else { v.currentTime = c.start; play(); } };
  $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/d/' + d.id);
  $('#rLike').onclick = () => $('#rLike').classList.toggle('on', toggleLike(d));
  $('#rLog').onclick = () => { if (mode === 'play') { v.pause(); $('#paused').hidden = false; } logSheet(d, rewind); };
  $('#rScenes').onclick = () => { if (mode === 'play') { v.pause(); $('#paused').hidden = false; } scenesSheet(d, rewind); };
  $('#rCC').onclick = () => { S.settings.subs = S.settings.subs === 'en' ? 'both' : 'en'; save(); $('#rCC span').textContent = S.settings.subs === 'en' ? 'EN' : (lang() === 'zh' ? '中/EN' : 'EN/中'); };

  // 起点
  const startAt = () => { const c = d.chapters[from] || d.chapters[0];
    if (c.kind === 'rt' && !watch){ v.currentTime = c.pause; curCh = -1; onTime(); if (mode !== 'choose') openChoice(from); }
    else { v.currentTime = c.start; play(); } };
  if (v.readyState >= 1) startAt(); else v.addEventListener('loadedmetadata', startAt, {once: true});
  onLeave(() => { cancelAnimationFrame(raf); waitTimer.forEach(clearTimeout); v.pause(); v.removeAttribute('src'); v.load(); });
}

// ---------- 实时播放器（直接调这部剧的中转：开场 → 选项/输入 → 导演层 + 两段并发生成 → 第 1 段按第 2 段出片倒推开播 → 两段接着播） ----------
function LivePlayer(view, d){
  document.body.classList.add('notabs', 'noscroll');
  const C = liveCfg(d.id), LV = d.live, API = C.api, K = C.k, MODE = LV.mode || '5+10';
  const modeTxt = m => m && m !== 'auto' ? ' · ' + m.replace('+', 's + ') + 's' : '';
  const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(new URL(API).hostname);
  const P = S.progress[d.id] = S.progress[d.id] || {log: [], done: []}; P.live = P.live || [];
  view.innerHTML = `<div class="player" id="pl">
    <video class="lv on" playsinline preload="auto" poster="${esc(d.cover)}"></video><video class="lv" playsinline preload="auto"></video><video class="lv" playsinline preload="auto"></video>
    <div class="p-shade"></div><div class="p-tap" id="tap"></div>
    <div class="p-top"><div class="p-title"><button class="iconbtn" id="back">${ICON.back}</button><div><b>${esc(L(d.title))}</b><span id="chLabel">${T('opening')}</span></div>${castingOf(d.id) ? `<span class="asme">${avatar(castingOf(d.id))}${esc(castingOf(d.id).name)}</span>` : ''}<span class="pill live p-mode">${T('liveTag')}</span></div>
      <div class="livestat" id="stat"></div></div>
    <div class="rail p-rail"><button class="like${S.liked[d.id] ? ' on' : ''}" id="rLike">${ICON.heart}<span>${T('liked')}</span></button>
      <button id="rLog">${ICON.book}<span>${T('log')}</span></button><button id="rRe">${ICON.restart}<span>${T('restart')}</span></button>
      <button id="rCC">${ICON.cc}<span>${S.settings.subs === 'en' ? 'EN' : (lang() === 'zh' ? '中/EN' : 'EN/中')}</span></button></div>
    <div class="subs" id="subs"></div><div class="wait" id="wait"></div><div class="choice" id="choice"></div>
    <button class="tapstart" id="tapStart" hidden>${ICON.play}<span>${T('tapStart')}</span></button></div>`;
  const pl = $('#pl'), subs = $('#subs'), choice = $('#choice'), wait = $('#wait'), stat = $('#stat');
  const pool = $$('video.lv', pl); let front = pool[0];
  let sid = null, next = null, round = 0, busy = false, run = 0, alive = true;
  const setMode = m => { pl.classList.toggle('choosing', m === 'choose'); pl.classList.toggle('waiting', m === 'wait'); };
  const setStat = h => { stat.innerHTML = h; };
  const show = el => { const old = front; front = el; el.classList.add('on'); const retire = () => { if (old !== front){ old.classList.remove('on'); old.pause(); } }; requestAnimationFrame(retire); setTimeout(retire, 60); };
  const spare = () => pool.find(v => v !== front && !v.dataset.keep) || pool.find(v => v !== front);
  const load = (el, src, loop) => { el.loop = !!loop; el.muted = !!loop; el.dataset.src = src; el.src = src; el.load(); };
  const abs = u => u && u.startsWith('/') ? API + u : u;
  const music = new Audio(LV.wait); music.loop = true; music.volume = 0; let mTarget = 0;
  const mTick = setInterval(() => { const dv = mTarget - music.volume; if (Math.abs(dv) > .01) music.volume = Math.max(0, Math.min(1, music.volume + Math.sign(dv) * .03)); if (!mTarget && music.volume < .02 && !music.paused) music.pause(); }, 50);
  const waitMusic = on => { mTarget = on ? .3 : 0; if (on && music.paused) music.play().catch(() => {}); };
  const AUD = {}; const preAudio = u => { u = abs(u); if (u && !AUD[u]){ const a = new Audio(); a.preload = 'auto'; a.src = u; AUD[u] = a; } return AUD[u]; };
  function showSub(c, who){
    if (!c){ subs.innerHTML = ''; return; }
    subs.className = 'subs' + (who === 'you' ? ' you' : '') + (S.settings.subs === 'en' ? ' lang-en' : '');
    const label = who === 'you' ? youName : who === 'him' || who === d.name ? nm(d) : who === 'Her' || who === '她' ? (persona ? persona.name : Z('她', 'Her')) : who;
    subs.innerHTML = `<div class="who">${esc(label)}</div>${c.en ? `<div class="en">${esc(c.en)}</div>` : ''}${c.zh ? `<div class="zh">${esc(c.zh)}</div>` : ''}`;
  }
  async function api(path, body){  // text/plain：不触发跨域预检，隧道少一个来回
    const r = await fetch(API + path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'text/plain'} : {}, body: body ? JSON.stringify(Object.assign({k: K}, body)) : undefined});
    const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.err || r.status), {code: r.status}); return j;
  }
  fetch(`${API}/api/ping?k=${encodeURIComponent(K)}`).then(r => r.json()).then(j => setStat(!j.ok ? `<i class="bad"></i>${T('liveBadKey')}` : `<i></i>${T('liveConn')} · ${esc(j.model)} · ${esc(MODE)}`))
    .catch(() => setStat(`<i class="bad"></i>${T('liveOff2')}`));

  // 开场：预制开场片 → 待机循环 → 第一个选择点
  const ov = pool[1], idle = pool[2];
  load(ov, LV.open); load(idle, LV.idle, true);
  const persona = castingOf(d.id), youName = persona ? persona.name : T('you');
  const startSession = () => api('/api/session', Object.assign({mode: MODE}, persona ? {persona: cardText(persona)} : {})).then(j => { sid = j.sid; next = j.next; round = 0; });
  function playOpening(){
    run++; busy = false; setMode('play'); showSub(null); $('#chLabel').textContent = T('opening');
    ov.currentTime = 0; ov.muted = false; ov.loop = false;
    ov.play().then(() => { show(ov); $('#tapStart').hidden = true; }).catch(() => { $('#tapStart').hidden = false; });
    ov.ontimeupdate = () => { const t = ov.currentTime, c = LV.open_cues.find(q => t >= q.s && t <= q.e); showSub(c || null, c && c.who); };
    ov.onended = () => { ov.ontimeupdate = null; idle.currentTime = 0; idle.play().catch(() => {}); show(idle); openChoice(); };
  }
  $('#tapStart').onclick = () => { $('#tapStart').hidden = true; music.play().then(() => { if (!mTarget) music.pause(); }).catch(() => {}); playOpening(); };
  startSession().catch(e => setStat(`<i class="bad"></i>${esc(e.message)}`));
  playOpening();

  // 选择点：导演层给的两个选项 + 输入框 + 灵感
  const optText = o => lang() === 'zh' ? `${esc(o.zh || o.en)}${o.en && o.zh ? `<small>${esc(o.en)}</small>` : ''}` : esc(o.en || o.zh);
  async function openChoice(){
    const my = run; setMode('choose'); waitMusic(true);
    for (let i = 0; i < 150 && !next && alive; i++) await new Promise(r => setTimeout(r, 100));
    if (my !== run || !alive) return;
    $('#chLabel').textContent = T('scene', {n: round + 1}) + ' · LIVE';
    const ideas = rts(d).map(x => L(x.said)).filter(Boolean).sort(() => Math.random() - .5).slice(0, 3);
    const cue = next && next.cue ? (lang() === 'zh' ? next.cue.zh || next.cue.en : next.cue.en) : T('waitsYou', {name: nm(d)});
    choice.innerHTML = `<div class="cue"><b>${T('scene', {n: round + 1})} · ${T('yourTurn')}</b>${esc(cue)}</div>
      ${next ? ['A', 'B'].filter(k => next[k]).map(k => `<button class="opt" data-k="${k}"><i>${k}</i>${optText(next[k])}</button>`).join('') : ''}
      <form class="say" id="sayF"><div class="inbox"><input id="sayIn" maxlength="120" autocomplete="off" placeholder="${esc(T('sayPh', {name: nm(d)}))}"><button type="button" class="bulb" id="bulb" title="${T('ideas')}">${ICON.bulb}</button></div><button class="send" type="submit">${ICON.send}</button></form>
      <div class="ideas" id="ideas" hidden>${ideas.map(x => `<button data-say="${esc(x)}"><small>${T('ideaOther')}</small>${esc(x)}</button>`).join('')}</div>`;
    requestAnimationFrame(() => { choice.classList.add('show'); subs.style.bottom = (choice.offsetHeight + 8) + 'px'; });
    $('#bulb').onclick = () => { $('#ideas').hidden = !$('#ideas').hidden; subs.style.bottom = (choice.offsetHeight + 8) + 'px'; };
    $$('.opt', choice).forEach(b => b.onclick = () => liveRound('option', b.dataset.k, next[b.dataset.k]));
    $$('[data-say]', choice).forEach(b => b.onclick = () => liveRound('free', null, {zh: b.dataset.say, en: b.dataset.say}));
    $('#sayF').onsubmit = e => { e.preventDefault(); const t = $('#sayIn').value.trim(); if (t) liveRound('free', null, {zh: t, en: t}); else $('#sayIn').focus(); };
  }
  const closeChoice = () => { choice.classList.remove('show'); subs.style.bottom = ''; };

  // 一幕：发出去 → 等导演层和两段生成 → 第 1 段按第 2 段预计出片倒推开播 → 两段接着播 → 下一个选择点
  async function liveRound(kind, ch, said){
    if (busy) return; busy = true; const my = ++run, t0 = Date.now(); let r = null, rid = null, polling = true;
    const text = lang() === 'en' ? (said.en || said.zh) : (said.zh || said.en);
    closeChoice(); setMode('wait'); waitMusic(true); showSub(null);
    wait.innerHTML = `<div class="bubble">${esc(text)}</div><h4>${T(d.genre === 'cozy' ? 'thinkCozy' : 'thinkRom', {name: nm(d)})}</h4><div class="dots"><i></i><i></i><i></i></div>
      <div class="steps" id="steps"><div><i></i>${T(kind === 'option' ? 'lStep1o' : 'lStep1')}</div><div><i></i><span id="s2">${T('lStep2', {n: 0, mode: modeTxt(MODE)})}</span></div><div><i></i>${T('lStep3')}</div></div>
      <div class="meta"><span id="lwT"></span></div>`;
    const st = $$('#steps div', wait); const mark = n => st.forEach((el, k) => { el.className = k < n ? 'ok' : k === n ? 'now' : ''; });
    const V = [spare()]; V[0].dataset.keep = 1; V.push(spare()); delete V[0].dataset.keep;
    const segErr = () => r && r.segs && r.segs.some(s => s.status === 'error');
    const tick = setInterval(() => { if (my !== run) return clearInterval(tick); $('#lwT', wait) && ($('#lwT', wait).textContent = T('liveWaited', {s: ((Date.now() - t0) / 1000).toFixed(1)}));
      const n = r && r.segs ? r.segs.filter(s => s.url).length : 0; $('#s2', wait) && ($('#s2', wait).textContent = T('lStep2', {n, mode: modeTxt(r ? r.mode : MODE)}));
      mark(!r || r.status === 'submitted' ? 0 : r.segs && r.segs[0] && r.segs[0].url ? 2 : 1); }, 100);
    const fail = msg => { clearInterval(tick); polling = false; busy = false; toast(msg); setMode('play'); if (my === run) openChoice(); };
    try { rid = (await api('/api/round', {sid, kind, choice: ch, input: kind === 'free' ? said.zh : undefined})).id; }
    catch (e){ return fail(e.code === 429 ? T('busyGen') : e.code === 410 ? e.message : T('liveFail', {e: e.message})); }
    (async () => { while (polling && alive){  // 上一次返回后再发下一次（隧道每次 1 秒多，定时器会把请求堆起来）
      try { r = await api(`/api/round/${rid}?k=${encodeURIComponent(K)}`); } catch (e) {}
      if (r && r.segs) r.segs.forEach((s, i) => { const u = abs(s.url); if (u && V[i] && V[i].dataset.src !== u) load(V[i], u); });  // 一到就预载
      if (r && Array.isArray(r.lines)) r.lines.forEach(l => l.audio && preAudio(l.audio));  // 咪的配音也一出来就预载
      await new Promise(res => setTimeout(res, LOCAL ? 500 : 1200)); } })();
    const M = LOCAL ? 1.5 : 3.0;  // 轮询、隧道延迟和第 2 段缓冲的余量（秒）
    const seg1Ok = () => r && r.segs && r.segs[0] && r.segs[0].url && V[0].dataset.src === abs(r.segs[0].url) && V[0].readyState >= 3;
    const seg2Soon = () => { const s2 = r.segs[1]; if (!s2 || s2.url) return true; const d1 = V[0].duration || r.segs[0].dur || 5; return s2.eta_left != null && s2.eta_left <= d1 - M - (s2.dur >= 15 ? 1.5 : 0); };
    const dub = LV.lines === 'dub'; let vidAt = 0;
    const aud = k => !(r.lines || []).some(l => l.seg === k && !l.audio && !l.audio_err);
    const voiced = () => !dub || aud(1) || (vidAt && Date.now() - vidAt > 4000);  // 只等第 1 段的配音，第 2 段的到了会自动用上
    await new Promise(res => (function f(){ if (my !== run || !alive) return; if ((r && r.status === 'error') || segErr() || (seg1Ok() && seg2Soon() && (vidAt = vidAt || Date.now()) && voiced())) res(); else setTimeout(f, 100); })());
    if (my !== run || !alive){ polling = false; clearInterval(tick); return; }
    if (r.status === 'error' || segErr()){ const low = (r.segs || []).some(s => s.err_code === 10005);
      if (rid) api(`/api/round/${rid}/view`, {end_at: Date.now()}).catch(() => {});
      return fail(low ? T('lowBal') : T('liveFail', {e: (r.segs || []).map(s => s.err).filter(Boolean)[0] || r.err || '—'})); }
    clearInterval(tick); mark(3);
    const view = {play_at: Date.now(), seg2_eta: r.segs[1] ? r.segs[1].eta_left : null};
    setMode('play'); waitMusic(false);
    await play(0); view.seg1_end = Date.now();
    if (r.segs.length > 1){
      const ok2 = () => segErr() || (r.segs[1].url && V[1].dataset.src === abs(r.segs[1].url) && V[1].readyState >= 3);
      if (!ok2()){ waitMusic(true); while (!ok2() && my === run && alive) await new Promise(res => setTimeout(res, 100)); waitMusic(false); }  // 第 2 段还没到：停在第 1 段最后一帧
      view.stall = (Date.now() - view.seg1_end) / 1000;
      if (my === run && !segErr()) await play(1);
    } else view.stall = 0;
    polling = false; view.end_at = Date.now();
    if (rid) api(`/api/round/${rid}/view`, view).catch(() => {});
    if (my !== run || !alive) return;
    const first = his();
    P.live.push({n: round + 1, text, en: first.en, zh: first.zh, at: Date.now()}); P.at = Date.now(); save();
    afterScene(L(d.title), text, his2(), (S.casting || {})[d.id] && String(S.casting[d.id]).startsWith('c.') ? S.casting[d.id] : null);
    toast(T('liveDone', {n: round + 1, s: ((view.play_at - t0) / 1000).toFixed(1)}));
    busy = false; round++; next = r.next || next; openChoice();

    function his2(){ if (dub) return (r.lines || []).map(l => ({who: nm(d), en: l.en, zh: l.zh})); const E = [].concat((r.lines || {}).seg1 || [], (r.lines || {}).seg2 || []), Zh = [].concat((r.zh || {}).seg1 || [], (r.zh || {}).seg2 || []); return E.filter(Boolean).map((e, i) => ({who: nm(d), en: e, zh: Zh[i] || ''})); }
    function his(){ if (dub){ const l = (r.lines || [])[0] || {}; return {en: l.en, zh: l.zh}; } return {en: ((r.lines || {}).seg1 || [])[0], zh: ((r.zh || {}).seg1 || [])[0]}; }
    function play(i){ return new Promise(res => {
      const v = V[i]; v.currentTime = 0; v.muted = false; v.loop = false; let done = false;
      const end = () => { if (done) return; done = true; v.ontimeupdate = null; if (cur) cur.onended = null; showSub(null); res(); };
      let cur = null;
      if (dub){  // 咪的台词是另配的声音（画面里咪不开口）：第 1 段 0.4 秒起、第 2 段 1 秒起逐句播，句间 0.4 秒
        const Ls = (r.lines || []).filter(l => l.seg === i + 1); let k = -1, nextAt = i === 0 ? 0.4 : 1.0; v.volume = 0.6;
        const say = () => { k++; if (k >= Ls.length){ cur = null; return; } const l = (r.lines || []).find(x => x.seg === Ls[k].seg && x.en === Ls[k].en) || Ls[k]; showSub({en: l.en, zh: l.zh}, l.who || 'him');
          if (l.audio){ cur = preAudio(l.audio); cur.currentTime = 0; cur.onended = () => { showSub(null); nextAt = v.currentTime + 0.4; cur = null; }; cur.play().catch(() => { cur = null; nextAt = v.currentTime + 2.2; }); }
          else { cur = null; nextAt = v.currentTime + 2.4; } };
        v.ontimeupdate = () => { if (my !== run || !alive) return end(); const dd = Math.min(v.duration || r.segs[i].seconds, r.segs[i].cut_at || 1e9);  // 中转标了提前收尾点就按它
          if (!cur && k < Ls.length - 1 && v.currentTime >= Math.max(nextAt, Ls[k + 1].at || 0)) say();
          if (dd && v.currentTime >= dd - 0.06) end(); };
      } else {  // Magnus 原声：台词按时长均分，第 2 段前 2 秒是静止承接
        v.volume = 1; const Lns = ((r.lines || {})['seg' + (i + 1)] || []).filter(Boolean), Z = ((r.zh || {})['seg' + (i + 1)] || []).filter(Boolean), off = i === 1 ? 2 : 0;
        v.ontimeupdate = () => { if (my !== run || !alive) return end(); const dd = Math.min(v.duration || r.segs[i].seconds, r.segs[i].cut_at || 1e9);  // 中转标了提前收尾点就按它
          const LT = (r.line_times || {})['seg' + (i + 1)];  // 中转给了每句的真实时间就按它显示，说完就收
          if (LT){ const c = LT.find(x => v.currentTime >= x.s && v.currentTime <= x.e); showSub(c ? {en: c.en, zh: c.zh || ''} : null, c && c.who); }
          else if (Lns.length){ const t = Math.max(0, v.currentTime - off), k = Math.min(Lns.length - 1, Math.floor(t / (dd - off) * Lns.length)); showSub({en: Lns[k], zh: Z[k] || ''}, 'him'); }
          if (dd && v.currentTime >= dd - 0.06) end(); };
      }
      v.onended = end; v.onerror = end;
      v.play().then(() => show(v)).catch(() => { v.muted = true; v.play().then(() => show(v)).catch(end); });
    }); }
  }

  $('#tap').onclick = () => { if (front.muted && !front.loop){ front.muted = false; } };
  $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/d/' + d.id);
  $('#rLike').onclick = () => $('#rLike').classList.toggle('on', toggleLike(d));
  $('#rLog').onclick = () => logSheet(d, i => location.hash = `#/play/${d.id}?from=${i}`);
  $('#rRe').onclick = () => { closeChoice(); next = null; startSession().catch(() => {}); load(idle, LV.idle, true); playOpening(); };
  $('#rCC').onclick = () => { S.settings.subs = S.settings.subs === 'en' ? 'both' : 'en'; save(); $('#rCC span').textContent = S.settings.subs === 'en' ? 'EN' : (lang() === 'zh' ? '中/EN' : 'EN/中'); };
  onLeave(() => { alive = false; run++; clearInterval(mTick); music.pause(); Object.values(AUD).forEach(a => a.pause()); pool.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); }); });
}

// ---------- 实时开玩（嵌入这部剧自己的实时播放页） ----------
function Live(view, d){
  document.body.classList.add('notabs', 'noscroll');
  const url = liveUrl(d.id);
  if (!url){ toast(T('liveNone')); location.replace('#/d/' + d.id); return; }
  view.innerHTML = `<div class="liveframe"><button class="iconbtn back" id="back">${ICON.back}</button><iframe src="${esc(url)}" allow="autoplay; fullscreen; microphone" referrerpolicy="no-referrer"></iframe></div>`;
  $('#back').onclick = () => history.back();
}

// ---------- 在追 ----------
function Library(view){
  let t = 'progress';
  const draw = () => {
    const list = t === 'progress' ? D.filter(d => progOf(d.id) && ((progOf(d.id).log || []).length || progOf(d.id).i != null)).sort((a, b) => (progOf(b.id).at || 0) - (progOf(a.id).at || 0))
      : D.filter(d => S.saved[d.id]).sort((a, b) => S.saved[b.id] - S.saved[a.id]);
    view.innerHTML = `<div class="page-h"><h1>${T('libT')}</h1><p>${T('libS')}</p></div>
      <div class="seg" id="seg"><button data-t="progress" class="${t === 'progress' ? 'on' : ''}">${T('inProgress')}</button><button data-t="saved" class="${t === 'saved' ? 'on' : ''}">${T('savedTab')}</button></div>
      ${list.length ? list.map(d => { const p = progOf(d.id) || {}, last = (p.log || []).slice(-1)[0], pct = Math.round(100 * (p.done || []).length / d.rounds);
        return `<div class="libitem" data-id="${d.id}"><img src="${esc(d.cover)}" alt=""><div><b>${esc(L(d.title))}</b><span>${last ? T('lastSaid') + esc(last.text) : p.i != null ? T('scene', {n: Math.max(1, sceneNo(d, p.i))}) : T('notStarted')}</span><div class="bar"><i style="width:${pct}%"></i></div></div><button class="go" data-play="${d.id}">${ICON.play}</button></div>`; }).join('')
      : `<div class="empty">${T('noLib')}<br><br><a class="btn ghost" href="#/" style="height:40px">${T('goTheater')}</a></div>`}`;
    $('#seg').onclick = e => { const b = e.target.closest('button'); if (b){ t = b.dataset.t; draw(); } };
    $$('.libitem').forEach(el => el.onclick = e => { const p = e.target.closest('[data-play]'); location.hash = p ? `#/play/${p.dataset.play}?resume=1` : '#/d/' + el.dataset.id; });
  };
  draw();
}

// ---------- 我的 ----------
function Me(view){
  const said = D.reduce((n, d) => n + ((progOf(d.id) || {}).log || []).length, 0);
  const scenes = D.reduce((n, d) => n + ((progOf(d.id) || {}).done || []).length, 0);
  const chev = ICON.chev.replace('<svg', '<svg');
  view.innerHTML = `<div class="page-h"><h1>${T('tabMe')}</h1></div>
    <div class="me-card"><div class="av">${esc(S.nick.slice(0, 1))}</div><div style="flex:1"><b id="nick">${esc(S.nick)} ✎</b><p>${T('meSub')}</p></div>${walletPill()}</div>
    <div class="list-h">${Z('我的角色', 'My characters')}</div>
    <div class="scroller mychars">${mine().map(c => `<div class="mychar" data-go="#/actor/${c.id}">${avatar(toActor(c))}<b>${esc(c.name)}</b><small>${esc(c.job || '')}${(c.listing || {}).mid ? ' · ' + Z('已上架', 'Listed') : ''}</small></div>`).join('')}<div class="mychar add" data-go="#/char/new"><span class="av blank">＋</span><b>${Z('新建', 'New')}</b></div></div>
    ${S.blank && (S.blank.pending || []).length ? `<div class="list" style="margin-top:12px"><div class="li" id="blankGrow"><span>${Z(`空白的你长出了 ${S.blank.pending.length} 条设定`, `${S.blank.pending.length} details grew while playing blank`)}</span><em>${Z('存成角色', 'Save')}</em>${chev}</div></div>` : ''}
    <div class="list" style="margin-top:12px"><div class="li" data-go="#/stage"><span>🎭 ${Z('我的自由剧场', 'My free-stage plays')}</span><em>${Object.keys(S.stages || {}).length}</em>${chev}</div><div class="li" data-go-wallet><span>★ ${Z('星票钱包与片酬收入', 'Stars & earnings')}</span><em data-wallet>${S.wallet ? S.wallet.balance : '—'}</em>${chev}</div></div>
    <div class="me-stats"><div><b>${said}</b><span>${T('stSaid')}</span></div><div><b>${scenes}</b><span>${T('stScenes')}</span></div><div><b>${Object.keys(S.saved).length}</b><span>${T('stSaved')}</span></div></div>
    <div class="list-h">${T('myLog')}</div>
    <div class="list">${D.map(d => `<div class="li" data-log="${d.id}"><span>${esc(L(d.title))}</span><em>${((progOf(d.id) || {}).log || []).length}</em>${chev}</div>`).join('')}</div>
    <div class="list-h">${T('general')}</div>
    <div class="list"><div class="li" id="mLang"><span>${T('langL')}</span><em>${S.settings.lang === 'auto' ? T('langAuto') : S.settings.lang === 'zh' ? '中文' : 'English'}</em>${chev}</div>
      <div class="li" id="mSubs"><span>${T('subsL')}</span><em>${S.settings.subs === 'en' ? T('subsEn') : T('subsBoth')}</em>${chev}</div></div>
    <div class="list-h">${T('dev')}</div>
    <div class="list"><div class="li" id="mLive"><span>${T('liveL')}</span><em>${Object.values(S.settings.live || {}).filter(Boolean).length}/${D.length}</em>${chev}</div>
      <div class="li" id="mAbout"><span>${T('aboutL')}</span>${chev}</div>
      <div class="li" id="mClear"><span style="color:var(--rose)">${T('clearL')}</span></div></div>`;
  $$('[data-go]', view).forEach(el => el.onclick = () => location.hash = el.dataset.go);
  if ($('#blankGrow')) $('#blankGrow').onclick = () => growSheet(null);
  $('#nick').onclick = () => { const n = prompt(Z('你的昵称（上架演员时显示）', 'Your nickname'), S.nick); if (n && n.trim()){ S.nick = n.trim().slice(0, 20); save(); if (studio()) sapi('/api/me', {}).catch(() => {}); route(); } };
  $$('[data-log]').forEach(el => el.onclick = () => { const d = byId[el.dataset.log]; logSheet(d, i => location.hash = `#/play/${d.id}?from=${i}`); });
  $('#mLang').onclick = () => { const order = ['auto', 'zh', 'en']; S.settings.lang = order[(order.indexOf(S.settings.lang) + 1) % 3]; save(); applyStatic(); route(); };
  $('#mSubs').onclick = () => { S.settings.subs = S.settings.subs === 'en' ? 'both' : 'en'; save(); route(); };
  $('#mClear').onclick = () => { if (!confirm(T('clearL') + '?')) return; S.progress = {}; S.liked = {}; S.saved = {}; save(); toast(T('cleared')); route(); };
  $('#mLive').onclick = () => sheet(T('liveL'), '', `<p class="note" style="margin:10px 0 16px">${T('liveHelp')}</p><div class="field"><label>${Z('创作服务（演员表 / 钱包 / 自由剧场）', 'Studio (cast, wallet, free stage)')}</label><input data-live="studio" value="${esc(liveUrl('studio') || '')}" placeholder="https://…?k=…" spellcheck="false"></div>${D.map(d => `<div class="field"><label>${esc(L(d.title))}</label>${d.live_hint ? `<small>${esc(L(d.live_hint))}</small>` : ''}<input data-live="${d.id}" value="${esc(liveUrl(d.id) || '')}" placeholder="https://…" spellcheck="false"></div>`).join('')}<button class="btn gold" id="liveSave" style="width:100%">${T('saveBtn')}</button>`,
    (sh, close) => $('#liveSave', sh).onclick = () => { $$('[data-live]', sh).forEach(i => { const u = i.value.trim(); if (u) S.settings.live[i.dataset.live] = u; else delete S.settings.live[i.dataset.live]; }); save(); close(); toast(T('liveSaved')); route(); });
  $('#mAbout').onclick = () => sheet(T('aboutL'), '', lang() === 'zh'
    ? `<div class="note"><p>这是「实时 AI 互动剧」聚合 APP 的网页预览版，目前收录 ${D.length} 部剧。</p><p><b>预览回放</b>：剧集里的每一幕都来自真实测试时的实时生成（Vivix W1，测试记录页公开托管）。你在选择点说什么都可以，等待动画之后播放的是测试时那一轮的真实结果；画面开头会注明当时的输入。</p><p><b>实时开玩</b>：在「实时链接」里填入某部剧的实时测试链接后，详情页会出现红色的实时按钮，在 APP 里直接打开那部剧自己的实时播放页。</p><p><b>加新剧</b>：在项目的 <code>catalog.json</code> 里追加一条（标题、简介、对应测试记录里的成片和测试组），运行 <code>python3 build_catalog.py</code> 后推送即可。</p><p><b>星票</b>：演员表、雇佣和生成功能用的是测试币，不涉及真钱。</p><p>数据更新于 ${esc(DATA.updated)}。</p></div>`
    : `<div class="note"><p>A web preview of a home for live AI interactive dramas, with ${D.length} titles so far.</p><p><b>Preview replay</b>: every scene is a real live generation from testing (Vivix W1). Say anything at a choice point; after the wait animation you see the real result from that test round, with the original input noted on screen.</p><p><b>Play live</b>: paste a drama's live test link in Live links and a red live button appears on its page.</p><p><b>Adding a drama</b>: add one entry to <code>catalog.json</code>, run <code>python3 build_catalog.py</code>, and push.</p><p>Data updated ${esc(DATA.updated)}.</p></div>`);
}

// ==================== 角色 · 演员表 · 自由剧场 · 星票 ====================
// 你的角色（c.*）存在本机；演员表 = Vicky 资产库演员（lib.*，docs/data/actors.js）+ 玩家上架的演员（u.*，创作服务共享）。
// 需要模型或共享数据的（AI 补全、生成定妆照/剧照、自由剧场写戏、上架、雇佣、钱包）走创作服务：链接里 ?live=studio~地址~口令。
const Z = (zh, en) => lang() === 'zh' ? zh : en;
const ACT = window.ACTORS || [];
const studio = () => parseLive((S.settings.live || {}).studio);
const imgUrl = u => u && u.startsWith('/img/') && studio() ? studio().api + u : u || '';
async function sapi(path, body){
  const c = studio(); if (!c) throw new Error(Z('创作服务没连上：请用带创作服务的测试链接打开', 'Studio offline: open the test link that includes the studio'));
  const r = await fetch(c.api + path + (body ? '' : (path.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(c.k)), {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'text/plain'} : {},
    body: body ? JSON.stringify(Object.assign({k: c.k, uid: S.uid, nick: S.nick}, body)) : undefined});
  const j = await r.json(); if (j.wallet){ S.wallet = j.wallet; save(); refreshWallet(); }
  if (!r.ok) throw Object.assign(new Error(j.err || r.status), {code: r.status}); return j;
}
const refreshWallet = () => $$('[data-wallet]').forEach(el => el.textContent = S.wallet ? S.wallet.balance : '—');
const walletPill = () => `<button class="wallet" data-go-wallet>★ <b data-wallet>${S.wallet ? S.wallet.balance : '—'}</b></button>`;
let market = [];
const loadMarket = () => studio() ? sapi('/api/market').then(j => { market = j.actors || []; return market; }).catch(() => market) : Promise.resolve(market);
const FIELDS = [['name', '名字', 'Name'], ['age', '年龄', 'Age'], ['gender', '性别', 'Gender'], ['job', '职业 / 身份', 'Occupation'], ['look', '外形', 'Look'],
  ['personality', '性格（逗号分隔）', 'Personality (comma separated)'], ['voice', '说话方式', 'Voice'], ['likes', '喜好', 'Likes'], ['backstory', '来历', 'Backstory'],
  ['world', '世界观', 'World'], ['secret', '秘密', 'Secret'], ['goal', '想要的东西', 'Goal']];
const mine = () => Object.values(S.chars || {}).sort((a, b) => b.created - a.created);
const toActor = c => ({id: c.id, name: c.name || Z('未命名角色', 'Untitled'), role: c.job || '', face: c.face, body: c.face, tags: [], personality: arrOf(c.personality), bio: c.backstory || '',
  age: c.age, look: c.look, owner: S.nick, mine: true, price: (c.listing || {}).price || 0, src: c});
const arrOf = v => Array.isArray(v) ? v : String(v || '').split(/[,，、]/).map(x => x.trim()).filter(Boolean);
function actorById(id){
  if (!id) return null;
  if (id.startsWith('c.')) return S.chars[id] ? toActor(S.chars[id]) : null;
  return ACT.find(a => a.id === id) || market.find(a => a.id === id) || null;
}
function cardText(a){  // 交给实时导演层 / 创作服务的角色卡
  if (!a) return '';
  const c = a.src || a, out = [];
  FIELDS.forEach(([k, zh]) => { const v = k === 'personality' ? arrOf(c[k]).join('、') : c[k]; if (v) out.push(`${zh.split('（')[0]}：${v}`); });
  if (!c.job && a.role) out.push('身份：' + a.role); if (!c.backstory && a.bio) out.push('来历：' + a.bio);
  (c.memories || []).slice(-5).forEach(m => out.push(`演出记忆（${m.drama}）：${m.text}`));
  return out.join('\n');
}
function studioCard(a){ const c = a.src || a; const o = {name: c.name || a.name, face: imgUrl(a.face)}; FIELDS.forEach(([k]) => { if (c[k]) o[k] = c[k]; });
  if (!o.job && a.role) o.job = a.role; if (!o.backstory && a.bio) o.backstory = a.bio; if (!o.personality && a.personality) o.personality = a.personality; o.memories = c.memories || []; return o; }
// 串场身份：每部剧记住你用哪个身份进（空白 = 无设定的你）
const castingOf = id => actorById((S.casting || {})[id]);
function avatar(a, cls = 'av'){ return a && a.face ? `<img class="${cls}" src="${esc(imgUrl(a.face))}" alt="">` : `<span class="${cls} blank">${esc((a && a.name || '?').slice(0, 1))}</span>`; }
function personaSheet(dramaId, title, onDone){
  const cur = (S.casting || {})[dramaId] || '';
  const opts = [{id: '', name: Z('空白的你', 'Blank you'), sub: Z('无设定，你说什么就是什么；演着演着长出来的设定可以存成角色', 'No preset. What you say becomes who you are')}]
    .concat(mine().map(c => ({id: c.id, name: c.name || Z('未命名角色', 'Untitled'), sub: [c.age, c.job].filter(Boolean).join(' · '), a: toActor(c)})));
  sheet(Z('以谁的身份进入', 'Enter as'), esc(title), `<div class="plist">${opts.map(o => `<button class="prow${o.id === cur ? ' on' : ''}" data-p="${o.id}">${o.a ? avatar(o.a) : '<span class="av blank">∅</span>'}<span><b>${esc(o.name)}</b><small>${esc(o.sub || '')}</small></span></button>`).join('')}
    <button class="prow add" data-new>＋<span><b>${Z('新建角色', 'New character')}</b><small>${Z('或去演员表签一个新人来培养', 'Or sign a new face from the cast')}</small></span></button></div>`,
    (sh, close) => { $$('[data-p]', sh).forEach(b => b.onclick = () => { S.casting = S.casting || {}; S.casting[dramaId] = b.dataset.p; save(); close(); onDone && onDone(); });
      $('[data-new]', sh).onclick = () => { close(); location.hash = '#/char/new'; }; });
}
// 演完一幕：记进角色的演出记忆，再请创作服务提炼新设定，玩家点采纳才写进卡
function afterScene(dramaTitle, said, lines, personaId){
  const c = personaId && S.chars[personaId];
  const target = c || (S.blank = S.blank || {growth: [], memories: []});
  const first = (lines || [])[0];
  target.memories = (target.memories || []).concat([{drama: dramaTitle, text: `说「${said}」${first ? `，对方回「${first.zh || first.en}」` : ''}`, at: Date.now()}]).slice(-30);
  if (c){ c.credits = c.credits || {}; c.credits[dramaTitle] = (c.credits[dramaTitle] || 0) + 1; }
  save();
  if (!studio()) return;
  sapi('/api/grow', {card: studioCard(c ? toActor(c) : {name: Z('空白的你', 'Blank you'), src: target}), drama: dramaTitle, said, scene: lines}).then(j => {
    const g = (j.grow || []).filter(x => x && x.field && x.value); if (!g.length) return;
    target.pending = (target.pending || []).concat(g.map(x => Object.assign(x, {drama: dramaTitle, at: Date.now()}))).slice(-12); save();
    growToast(g, personaId);
  }).catch(() => {});
}
function growToast(g, personaId){
  const host = document.querySelector('.player') || $('#app'); const el = document.createElement('div'); el.className = 'growtoast fade-in';
  el.innerHTML = `<b>✦ ${Z('从这一幕长出的设定', 'New from this scene')}</b>${g.slice(0, 3).map(x => `<span>${esc(fieldName(x.field))}：${esc(String(x.value).slice(0, 40))}</span>`).join('')}<button>${Z('去采纳', 'Review')}</button>`;
  host.appendChild(el); $('button', el).onclick = () => { el.remove(); growSheet(personaId); }; setTimeout(() => el.remove(), 9000);
}
const fieldName = f => (FIELDS.find(x => x[0] === f) || [f, f === 'memories' ? '演出记忆' : f, f])[lang() === 'zh' ? 1 : 2].split('（')[0];
function growSheet(personaId){
  const c = personaId ? S.chars[personaId] : S.blank; if (!c) return;
  const p = c.pending || [];
  sheet(Z('待采纳的设定', 'Suggested details'), esc(personaId ? c.name : Z('空白的你', 'Blank you')), p.length ? `<div class="glist">${p.map((x, i) => `<div class="gitem"><div><small>${esc(fieldName(x.field))} · ${esc(x.drama || '')}</small><p>${esc(x.value)}</p>${x.why ? `<em>${esc(x.why)}</em>` : ''}</div><button class="btn gold sm" data-ok="${i}">${Z('采纳', 'Keep')}</button><button class="btn ghost sm" data-no="${i}">${Z('忽略', 'Skip')}</button></div>`).join('')}</div>
    ${personaId ? '' : `<button class="btn gold" id="saveBlank" style="width:100%;margin-top:14px">${Z('把这些存成我的角色', 'Save as my character')}</button>`}` : `<div class="empty">${Z('还没有新设定。用这个身份演几幕就会长出来。', 'Nothing yet. Play a few scenes.')}</div>`,
    (sh, close) => {
      const apply = (i, keep) => { const x = c.pending[i]; c.pending.splice(i, 1);
        if (keep){ c.growth = (c.growth || []).concat([x]); if (x.field === 'memories') c.memories = (c.memories || []).concat([{drama: x.drama, text: x.value, at: Date.now()}]);
          else if (x.field === 'personality') c.personality = [...new Set(arrOf(c.personality).concat(arrOf(x.value)))];
          else c[x.field] = x.value; }
        save(); close(); growSheet(personaId); };
      $$('[data-ok]', sh).forEach(b => b.onclick = () => apply(+b.dataset.ok, true)); $$('[data-no]', sh).forEach(b => b.onclick = () => apply(+b.dataset.no, false));
      const sb = $('#saveBlank', sh); if (sb) sb.onclick = () => { const id = newChar(Object.assign({}, ...p.filter(x => x.field !== 'memories').map(x => ({[x.field]: x.value})), {memories: c.memories || []})); S.blank = null; save(); close(); location.hash = '#/char/' + id; };
    });
}
function newChar(init){ const id = 'c.' + Math.random().toString(36).slice(2, 10); S.chars[id] = Object.assign({id, created: Date.now(), origin: 'custom', personality: [], memories: [], growth: [], pending: [], credits: {}}, init); save(); return id; }
function walletSheet(){
  const w = S.wallet;
  sheet(Z('星票钱包', 'Star wallet'), Z('测试币，不涉及真钱', 'Test currency, no real money'), w ? `<div class="wtop"><div><small>${Z('余额', 'Balance')}</small><b>★ ${w.balance}</b></div><div><small>${Z('演员片酬收入', 'Actor earnings')}</small><b>★ ${w.earned}</b></div></div>
    <button class="btn gold" id="topup" style="width:100%;margin:12px 0">${Z('领取 300 体验星票', 'Claim 300 test stars')}</button>
    <div class="ledger">${(w.ledger || []).map(x => `<div><span>${esc(x.what)}</span><b class="${x.d > 0 ? 'in' : ''}">${x.d > 0 ? '+' : ''}${x.d}</b></div>`).join('')}</div>
    <p class="note">${Z('价格：生成定妆照 80 · 生成剧照 30 · 雇演员按演员定的片酬（主人拿 70%，平台 30%）· AI 补全设定和写戏免费', 'Prices: portrait 80 · scene still 30 · hiring = the actor’s fee (owner gets 70%) · AI assist and scene writing free')}</p>`
    : `<div class="empty">${Z('创作服务没连上，钱包暂时看不到。', 'Studio offline.')}</div>`, (sh, close) => { const b = $('#topup', sh); if (b) b.onclick = () => sapi('/api/topup', {}).then(() => { close(); walletSheet(); toast('+300 ★'); }).catch(e => toast(e.message)); });
}
document.addEventListener('click', e => { if (e.target.closest('[data-go-wallet]')){ e.stopPropagation(); walletSheet(); } }, true);
const castCard = a => `<div class="acard" data-actor="${esc(a.id)}"><div class="pic"><img src="${esc(imgUrl(a.face))}" alt="" loading="lazy">
  ${a.mine ? `<span class="pill gold">${Z('我的', 'Mine')}</span>` : a.tier === 'rookie' ? `<span class="pill">${Z('新人待签', 'New face')}</span>` : a.owner_uid ? `<span class="pill">${Z('玩家原创', 'Player-made')}</span>` : `<span class="pill gold">${Z('签约', 'Signed')}</span>`}
  <div class="meta">${a.tier === 'rookie' ? Z('免费签下', 'Free to sign') : a.price ? `★ ${a.price} / ${Z('场', 'scene')}` : Z('免费', 'Free')}${a.hires ? ` · ${Z('被雇', 'hired')} ${a.hires}` : ''}</div></div>
  <b>${esc(a.name)}</b><span>${esc(a.role || (a.owner ? '@' + a.owner : ''))}</span></div>`;

function Cast(view){
  let seg = 'all';
  const draw = () => {
    const pool = seg === 'mine' ? mine().map(toActor) : seg === 'star' ? ACT.filter(a => a.tier === 'star') : seg === 'rookie' ? ACT.filter(a => a.tier === 'rookie') : seg === 'player' ? market
      : [...mine().map(toActor), ...ACT.filter(a => a.tier === 'star'), ...market, ...ACT.filter(a => a.tier === 'rookie')];
    $('#castGrid').innerHTML = pool.length ? pool.map(castCard).join('') : `<div class="empty" style="grid-column:1/-1">${seg === 'player' ? Z('还没有玩家上架演员。去创建你的角色，上架后别人就能雇 TA。', 'No player actors yet.') : Z('这里还是空的。', 'Nothing here yet.')}</div>`;
  };
  view.innerHTML = `<div class="page-h row" style="justify-content:space-between"><div><h1>${Z('演员表', 'Cast')}</h1><p>${Z('选一个角色带进任何一部剧，或雇来给你搭戏', 'Take a character into any drama, or hire one for yours')}</p></div>${walletPill()}</div>
    <div class="castcta"><button data-go="#/char/new"><b>＋ ${Z('创建我的角色', 'Create my character')}</b><small>${Z('名字、职业、世界观都由你写，AI 帮你补全', 'You write it, AI fills the gaps')}</small></button>
      <button data-go="#/stage"><b>🎭 ${Z('自由剧场', 'Free stage')}</b><small>${Z('自己写开场，雇演员来演', 'Your premise, hired actors')}</small></button></div>
    <div class="chips" id="cseg" style="margin-top:16px">${[['all', '全部', 'All'], ['star', '签约明星', 'Signed'], ['rookie', '新人待签', 'New faces'], ['player', '玩家原创', 'Player-made'], ['mine', '我的', 'Mine']].map(([k, zh, en], i) => `<button class="chip${i ? '' : ' on'}" data-s="${k}">${Z(zh, en)}</button>`).join('')}</div>
    <div class="grid" id="castGrid" style="margin-top:14px"></div>
    <p class="note" style="padding:18px 18px 0">${Z('签约明星和新人来自 Vicky 资产库；玩家原创是其他玩家培养后上架的角色。', 'Signed actors and new faces come from Vicky’s asset library; player-made actors are listed by other players.')}</p>`;
  $('#cseg').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; seg = b.dataset.s; $$('#cseg .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); };
  view.onclick = e => { const g = e.target.closest('[data-go]'); if (g){ location.hash = g.dataset.go; return; } const a = e.target.closest('[data-actor]'); if (a) location.hash = '#/actor/' + encodeURIComponent(a.dataset.actor); };
  onLeave(() => view.onclick = null);
  draw(); loadMarket().then(draw);
}

function Actor(view, id){
  document.body.classList.add('notabs');
  const a = actorById(id);
  if (!a){ view.innerHTML = `<div class="empty">${Z('找不到这个演员', 'Actor not found')}</div>`; loadMarket().then(() => actorById(id) && route()); return; }
  const isMine = !!a.mine, rookie = a.tier === 'rookie', listed = isMine && (a.src.listing || {}).on;
  const credits = isMine ? Object.entries(a.src.credits || {}).map(([k, n]) => `${k} × ${n}`) : (a.credits || []);
  view.innerHTML = `<div class="detail fade-in"><div class="d-bg actor"><img src="${esc(imgUrl(a.body || a.face))}" alt=""></div>
    <div class="d-top"><button class="iconbtn" id="back">${ICON.back}</button>${walletPill()}</div>
    <div class="d-head" style="margin-top:-40px"><div class="pills">${isMine ? `<span class="pill gold">${Z('我的角色', 'My character')}</span>` : rookie ? `<span class="pill">${Z('新人待签', 'New face')}</span>` : `<span class="pill gold">${a.owner_uid ? Z('玩家原创', 'Player-made') : Z('签约演员', 'Signed')}</span>`}${(a.tags || []).slice(0, 3).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      <h1>${esc(a.name)}</h1><div class="lead">${esc([a.age, a.role].filter(Boolean).join(' · '))}</div>
      <div class="d-stats"><div><b>${rookie ? Z('免费', 'Free') : a.price ? '★' + a.price : Z('免费', 'Free')}</b><span>${rookie ? Z('签约', 'to sign') : Z('片酬 / 场', 'per scene')}</span></div><div><b>${a.hires || 0}</b><span>${Z('被雇用', 'Hired')}</span></div><div><b>${credits.length}</b><span>${Z('出演作品', 'Credits')}</span></div></div>
      ${a.bio ? `<p class="d-hook">${esc(a.bio)}</p>` : rookie ? `<p class="d-hook">${Z('只有一张脸和一个艺名，还没有性格和来历。签下 TA，由你来写 TA 的一切，再带 TA 去串场、上架接戏。', 'Just a face and a stage name. Sign them and write everything else.')}</p>` : ''}
      ${(a.personality || []).length ? `<div class="d-tags">${a.personality.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${a.look ? `<p class="note" style="margin-top:12px">${esc(a.look)}</p>` : ''}
      ${credits.length ? `<div class="list-h" style="margin:20px 0 8px">${Z('演出履历', 'Credits')}</div><div class="d-tags">${credits.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
      ${a.owner && !isMine ? `<p class="note" style="margin-top:14px">${Z('所属', 'Owner')}：${esc(a.owner)}</p>` : ''}</div>
    <div class="d-cta" style="margin-top:20px">${isMine ? `<button class="btn gold" id="aUse">${ICON.play}${Z('带 TA 去串场', 'Take into a drama')}</button><button class="btn ghost txt" id="aEdit">${Z('编辑', 'Edit')}</button>`
      : rookie ? `<button class="btn gold" id="aSign">${Z('签下 TA，开始培养', 'Sign & develop')}</button>`
      : `<button class="btn gold" id="aLead">${Z('扮演 TA', 'Play as')}${a.price ? ' · ★' + a.price : ''}</button><button class="btn ghost txt" id="aHire">${Z('雇来搭戏', 'Hire')}</button>`}</div></div>`;
  $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/cast');
  const go = (k, f) => { const b = $(k); if (b) b.onclick = f; };
  go('#aEdit', () => location.hash = '#/char/' + a.id);
  go('#aUse', () => pickDrama(a));
  go('#aSign', () => { const id = newChar({origin: 'lib', from: a.id, name: a.name, face: a.face, look: a.look || '', style: a.style, gender: a.gender === 'female' ? Z('女', 'Female') : a.gender === 'male' ? Z('男', 'Male') : ''}); toast(Z('签下了！名字可以改，其余由你来写', 'Signed! Rename them if you like')); location.hash = '#/char/' + id; });
  go('#aLead', () => pickDrama(a));
  go('#aHire', () => { location.hash = '#/stage/new?cast=' + encodeURIComponent(a.id); });
}
// 带着某个角色去哪部剧：实时剧（导演层收到角色卡）或自由剧场
function pickDrama(a){
  const live = D.filter(d => liveNative(d)), others = D.filter(d => !liveNative(d) && d.kind === 'open');
  sheet(Z('带 TA 去哪', 'Where to'), esc(a.name), `<div class="plist">
    <button class="prow" data-stage>${avatar(a)}<span><b>🎭 ${Z('自由剧场', 'Free stage')}</b><small>${Z('自己写开场，可以再雇别的演员搭戏', 'Your own premise, hire co-stars')}</small></span></button>
    ${live.map(d => `<button class="prow" data-d="${d.id}"><img class="av" src="${esc(d.cover)}" alt=""><span><b>${esc(L(d.title))} <span class="pill live">LIVE</span></b><small>${Z('角色卡交给导演层：名字、身份、性格按你的设定演；画面外形仍是剧里原来的', 'Card goes to the director; visuals stay as in the drama')}</small></span></button>`).join('')}
    ${others.map(d => `<button class="prow" data-d="${d.id}" data-preview><img class="av" src="${esc(d.cover)}" alt=""><span><b>${esc(L(d.title))}</b><small>${Z('预览回放：只换称呼，剧情不会按角色变', 'Preview: name only')}</small></span></button>`).join('')}</div>`,
    (sh, close) => {
      const ensure = () => a.mine || !a.price ? Promise.resolve() : sapi('/api/hire', {actor: {id: a.id}, purpose: 'lead'}).then(j => toast(Z(`已付片酬 ★${j.paid}`, `Paid ★${j.paid}`)));
      $('[data-stage]', sh).onclick = () => { close(); location.hash = '#/stage/new?persona=' + encodeURIComponent(a.id); };
      $$('[data-d]', sh).forEach(b => b.onclick = () => ensure().then(() => { S.casting = S.casting || {}; S.casting[b.dataset.d] = a.id; save(); close(); location.hash = `#/play/${b.dataset.d}${b.dataset.preview == null ? '?live=1' : ''}`; }).catch(e => toast(e.message)));
    });
}

function Editor(view, id){
  document.body.classList.add('notabs');
  const isNew = id === 'new', c = isNew ? {personality: [], memories: [], growth: [], pending: []} : S.chars[id];
  if (!c){ location.replace('#/cast'); return; }
  const lst = c.listing || {};
  view.innerHTML = `<div class="editor fade-in"><div class="d-top solid"><button class="iconbtn" id="back">${ICON.back}</button><b>${isNew ? Z('创建角色', 'New character') : Z('编辑角色', 'Edit character')}</b>${walletPill()}</div>
    <div class="ed-face"><div class="ph" id="face">${c.face ? `<img src="${esc(imgUrl(c.face))}" alt="">` : `<span>${Z('还没有定妆照', 'No portrait yet')}</span>`}</div>
      <div class="ed-face-act"><button class="btn ghost sm" id="pickFace">${Z('从资产库挑脸', 'Pick from library')}</button>
        <div class="stylepick" id="style">${[['real', '写实', 'Real'], ['otome', '2.5D', '2.5D'], ['cozy', '温暖居家', 'Cozy']].map(([k, zh, en]) => `<button class="${(/otome|3d/.test(c.style || '') ? 'otome' : /cozy/.test(c.style || '') ? 'cozy' : 'real') === k ? 'on' : ''}" data-st="${k}">${Z(zh, en)}</button>`).join('')}</div>
        <button class="btn gold sm" id="gen">✨ ${Z('按设定生成定妆照 · ★80', 'Generate portrait · ★80')}</button></div></div>
    <div class="ed-assist"><button class="btn ghost" id="assist">✨ ${Z('AI 帮我补全空着的设定（免费）', 'AI: fill the blanks (free)')}</button><p class="note" id="assistNote">${Z('先写几个你在意的（比如名字和职业），其余交给 AI；写过的不会被改。', 'Write what matters, AI fills the rest; your fields stay.')}</p></div>
    <div class="ed-fields">${FIELDS.map(([k, zh, en]) => { const v = k === 'personality' ? arrOf(c[k]).join('，') : c[k] || ''; const long = ['look', 'backstory', 'world', 'secret', 'voice', 'likes', 'goal'].includes(k);
      return `<div class="field"><label>${Z(zh, en)}</label>${long ? `<textarea data-f="${k}" rows="2">${esc(v)}</textarea>` : `<input data-f="${k}" value="${esc(v)}">`}</div>`; }).join('')}</div>
    ${!isNew ? `<div class="ed-sec"><div class="list-h" style="margin:0 0 8px">${Z('演出中长出来的设定', 'Grown in play')}</div>${(c.pending || []).length ? `<button class="btn ghost sm" id="pend">${Z(`${c.pending.length} 条待采纳`, `${c.pending.length} to review`)}</button>` : ''}
      ${(c.growth || []).length ? (c.growth || []).slice(-8).map(g => `<p class="note">· ${esc(fieldName(g.field))}：${esc(g.value)} <em>（${esc(g.drama || '')}）</em></p>`).join('') : `<p class="note">${Z('带 TA 去演几幕，新设定会从你的台词里长出来。', 'Play a few scenes and details grow from what you say.')}</p>`}
      ${(c.memories || []).length ? `<div class="list-h" style="margin:14px 0 8px">${Z('演出记忆', 'Memories')}</div>${c.memories.slice(-5).map(m => `<p class="note">· ${esc(m.drama)}：${esc(m.text)}</p>`).join('')}` : ''}</div>` : ''}
    <div class="ed-sec"><div class="list-h" style="margin:0 0 8px">${Z('上架到演员表', 'List in the cast')}</div>
      <label class="tog"><input type="checkbox" id="lOn" ${lst.on ? 'checked' : ''}><span>${Z('上架：别的玩家可以扮演 TA、雇 TA 搭戏', 'List: others can play as or hire them')}</span></label>
      <div class="field"><label>${Z('片酬（星票 / 场，0 = 免费）', 'Fee (stars per scene, 0 = free)')}</label><input id="lPrice" type="number" min="0" max="500" value="${lst.price || 40}"></div>
      <p class="note">${Z('每被雇一次，片酬的 70% 进你的钱包。上架的是这张角色卡和定妆照，你的演出记忆不会公开。', 'You keep 70% of every fee. Your memories stay private.')}</p></div>
    <div class="ed-save"><button class="btn gold" id="saveC" style="width:100%">${Z('保存', 'Save')}</button>${!isNew ? `<button class="btn ghost" id="delC" style="width:100%;margin-top:8px;color:var(--rose)">${Z('删除这个角色', 'Delete')}</button>` : ''}</div></div>`;
  let face = c.face, style = /otome|3d/.test(c.style || '') ? 'otome' : /cozy/.test(c.style || '') ? 'cozy' : 'real';
  const read = () => { const o = {}; $$('[data-f]').forEach(i => { const v = i.value.trim(); o[i.dataset.f] = i.dataset.f === 'personality' ? arrOf(v) : i.dataset.f === 'age' && /^\d+$/.test(v) ? +v : v; }); return o; };
  const setFace = u => { face = u; $('#face').innerHTML = `<img src="${esc(imgUrl(u))}" alt="">`; };
  $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/cast');
  $('#style').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; style = b.dataset.st; $$('#style button').forEach(x => x.classList.toggle('on', x === b)); };
  $('#pickFace').onclick = () => sheet(Z('从资产库挑一张脸', 'Pick a face'), Z('Vicky 资产库', 'Vicky library'), `<div class="facegrid">${ACT.map(a => `<button data-face="${esc(a.face)}" data-look="${esc(a.look || '')}"><img src="${esc(a.face)}" alt="" loading="lazy"></button>`).join('')}</div>`,
    (sh, close) => $$('[data-face]', sh).forEach(b => b.onclick = () => { setFace(b.dataset.face); const lk = $('[data-f="look"]'); if (!lk.value && b.dataset.look) lk.value = b.dataset.look; close(); }));
  $('#assist').onclick = () => { const btn = $('#assist'); btn.disabled = true; btn.textContent = Z('AI 正在补全…', 'Filling…');
    sapi('/api/assist', {card: Object.assign(read(), {face: imgUrl(face)})}).then(j => { const f = j.fill || {}; $$('[data-f]').forEach(i => { const v = f[i.dataset.f]; if (!i.value.trim() && v != null && v !== '') i.value = Array.isArray(v) ? v.join('，') : v; });
      $('#assistNote').textContent = [j.tagline, j.note].filter(Boolean).join(' · '); }).catch(e => toast(e.message)).finally(() => { btn.disabled = false; btn.textContent = '✨ ' + Z('再补一次', 'Fill again'); }); };
  $('#gen').onclick = () => { const btn = $('#gen'); const card = read(); if (!card.look && !card.job && !card.name){ toast(Z('先写几句外形或身份', 'Describe the look first')); return; }
    btn.disabled = true; btn.textContent = Z('生成中，约 20 秒…', 'Generating…');
    sapi('/api/portrait', {card, style}).then(j => { setFace(j.url); toast(Z('定妆照好了 · 已扣 ★80', 'Portrait ready · ★80')); }).catch(e => toast(e.message)).finally(() => { btn.disabled = false; btn.textContent = '✨ ' + Z('重新生成 · ★80', 'Regenerate · ★80'); }); };
  if ($('#pend')) $('#pend').onclick = () => growSheet(id);
  if ($('#delC')) $('#delC').onclick = () => { if (!confirm(Z('删除这个角色？', 'Delete?'))) return; const l = c.listing || {}; if (l.mid) sapi('/api/unpublish', {id: l.mid}).catch(() => {}); delete S.chars[id]; save(); location.hash = '#/cast'; };
  $('#saveC').onclick = async () => {
    const o = read(); if (!o.name){ toast(Z('给角色取个名字', 'Give them a name')); return; }
    const cid = isNew ? newChar({}) : id, ch = S.chars[cid];
    Object.assign(ch, o, {face, style}); const on = $('#lOn').checked, price = Math.max(0, Math.min(500, +$('#lPrice').value || 0));
    ch.listing = Object.assign({}, ch.listing, {on, price}); save();
    if (on || (ch.listing || {}).mid){
      try {
        if (on){ if (!face){ toast(Z('上架需要一张定妆照', 'Listing needs a portrait')); return; }
          const j = await sapi('/api/publish', {actor: Object.assign(studioCard(toActor(ch)), {id: ch.listing.mid, face, role: o.job, bio: o.backstory, personality: arrOf(o.personality), price, tags: arrOf(o.personality).slice(0, 2), age: o.age})});
          ch.listing.mid = j.actor.id; toast(Z('已上架到演员表', 'Listed'));
        } else { await sapi('/api/unpublish', {id: ch.listing.mid}); ch.listing.mid = null; toast(Z('已下架', 'Unlisted')); }
        save();
      } catch (e){ toast(e.message); }
    } else toast(Z('已保存', 'Saved'));
    location.hash = '#/actor/' + cid;
  };
}

// ---------- 自由剧场：你的角色 + 雇来的演员，即兴写戏（文字 + 头像，可付费生成剧照） ----------
function Stages(view){
  const list = Object.values(S.stages || {}).sort((a, b) => b.at - a.at);
  view.innerHTML = `<div class="page-h row" style="justify-content:space-between"><div><h1>${Z('自由剧场', 'Free stage')}</h1><p>${Z('自己写开场和世界观，带上你的角色、雇演员来演', 'Write a premise, bring your character, hire a cast')}</p></div>${walletPill()}</div>
    <div style="padding:14px 18px 0"><button class="btn gold" style="width:100%" data-go="#/stage/new">＋ ${Z('新建一出戏', 'New play')}</button></div>
    ${list.length ? list.map(s => `<div class="libitem" data-go="#/stage/${s.id}"><div class="avs">${[s.persona, ...s.cast].filter(Boolean).slice(0, 3).map(a => avatar(a)).join('')}</div><div><b>${esc(s.title)}</b><span>${esc((s.world || '').slice(0, 40))}</span><span>${Z(`${s.scenes.length} 幕`, `${s.scenes.length} scenes`)}</span></div><button class="go">${ICON.play}</button></div>`).join('')
      : `<div class="empty">${Z('还没有戏。新建一出，写一句开场，剩下的交给演员。', 'No plays yet.')}</div>`}`;
  view.onclick = e => { const g = e.target.closest('[data-go]'); if (g) location.hash = g.dataset.go; }; onLeave(() => view.onclick = null);
}
function StageNew(view, q){
  document.body.classList.add('notabs');
  let persona = q.get('persona') || '', cast = q.get('cast') ? [q.get('cast')] : [];
  const draw = () => {
    const p = actorById(persona), cs = cast.map(actorById).filter(Boolean), fee = cs.reduce((n, a) => n + (a.mine ? 0 : a.price || 0), 0) + (p && !p.mine ? p.price || 0 : 0);
    $('#pSel').innerHTML = p ? `${avatar(p)}<span><b>${esc(p.name)}</b><small>${esc(p.role || '')}</small></span>` : `<span class="av blank">∅</span><span><b>${Z('空白的你', 'Blank you')}</b><small>${Z('无设定，演着演着长出来', 'No preset')}</small></span>`;
    $('#cSel').innerHTML = cs.map(a => `<span class="castchip">${avatar(a)}${esc(a.name)}${a.price && !a.mine ? ` · ★${a.price}` : ''}<button data-rm="${esc(a.id)}">✕</button></span>`).join('') + (cs.length < 3 ? `<button class="castchip add" id="addCast">＋ ${Z('雇演员', 'Hire')}</button>` : '');
    $('#fee').textContent = fee ? Z(`开演时付片酬 ★${fee}`, `Fees at curtain: ★${fee}`) : Z('不需要付片酬', 'No fees');
    $$('[data-rm]').forEach(b => b.onclick = () => { cast = cast.filter(x => x !== b.dataset.rm); draw(); });
    if ($('#addCast')) $('#addCast').onclick = () => sheet(Z('雇谁来演', 'Hire who'), '', `<div class="facegrid wide">${[...mine().map(toActor), ...ACT.filter(a => a.tier === 'star'), ...market].filter(a => !cast.includes(a.id) && a.id !== persona).map(a => `<button data-pick="${esc(a.id)}"><img src="${esc(imgUrl(a.face))}" alt="" loading="lazy"><span>${esc(a.name)}${a.price && !a.mine ? ` · ★${a.price}` : ''}</span></button>`).join('')}</div>`,
      (sh, close) => $$('[data-pick]', sh).forEach(b => b.onclick = () => { cast.push(b.dataset.pick); close(); draw(); }));
  };
  view.innerHTML = `<div class="editor fade-in"><div class="d-top solid"><button class="iconbtn" id="back">${ICON.back}</button><b>${Z('新建一出戏', 'New play')}</b>${walletPill()}</div>
    <div class="ed-fields"><div class="field"><label>${Z('剧名', 'Title')}</label><input id="sTitle" placeholder="${Z('比如：暴雨夜的暗房', 'e.g. Darkroom in the storm')}"></div>
      <div class="field"><label>${Z('世界观与开场', 'World & opening')}</label><textarea id="sWorld" rows="4" placeholder="${Z('写一两句：在哪、什么时候、发生了什么。也可以留空，让演员按人设开场。', 'Where, when, what happens. Or leave empty.')}"></textarea></div>
      <div class="field"><label>${Z('你的身份', 'You play as')}</label><button class="prow" id="pSel"></button></div>
      <div class="field"><label>${Z('演员（最多 3 位）', 'Cast (up to 3)')}</label><div class="castsel" id="cSel"></div></div></div>
    <div class="ed-save"><p class="note" id="fee"></p><button class="btn gold" id="go" style="width:100%">${Z('开演', 'Curtain up')}</button></div></div>`;
  $('#back').onclick = () => history.back();
  $('#pSel').onclick = () => sheet(Z('你的身份', 'You play as'), '', `<div class="plist"><button class="prow" data-p=""><span class="av blank">∅</span><span><b>${Z('空白的你', 'Blank you')}</b></span></button>${mine().map(c => `<button class="prow" data-p="${c.id}">${avatar(toActor(c))}<span><b>${esc(c.name)}</b><small>${esc(c.job || '')}</small></span></button>`).join('')}</div>`,
    (sh, close) => $$('[data-p]', sh).forEach(b => b.onclick = () => { persona = b.dataset.p; close(); draw(); }));
  $('#go').onclick = async () => {
    if (!studio()){ toast(Z('自由剧场需要创作服务，请用带创作服务的测试链接打开', 'Free stage needs the studio')); return; }
    const p = actorById(persona), cs = cast.map(actorById).filter(Boolean); if (!cs.length && !$('#sWorld').value.trim()){ toast(Z('至少雇一位演员，或者写个开场', 'Hire someone or write an opening')); return; }
    const btn = $('#go'); btn.disabled = true;
    try {
      for (const a of [...(p && !p.mine ? [p] : []), ...cs]) if (!a.mine && a.price) await sapi('/api/hire', {actor: {id: a.id}, purpose: a === p ? 'lead' : 'support'});
      const id = 's' + Date.now().toString(36); S.stages = S.stages || {};
      S.stages[id] = {id, title: $('#sTitle').value.trim() || Z('无题', 'Untitled'), world: $('#sWorld').value.trim(), personaId: persona || null, persona: p ? studioCard(p) : null, cast: cs.map(studioCard), scenes: [], at: Date.now()};
      save(); location.replace('#/stage/' + id);
    } catch (e){ toast(e.message); btn.disabled = false; }
  };
  draw(); loadMarket().then(draw);
}
function StagePlay(view, id){
  document.body.classList.add('notabs', 'noscroll');
  const st = (S.stages || {})[id]; if (!st){ location.replace('#/stage'); return; }
  const people = [st.persona, ...st.cast].filter(Boolean);
  const face = who => { const a = st.cast.find(x => x.name === who) || (st.persona && st.persona.name === who ? st.persona : null); return a; };
  view.innerHTML = `<div class="stage"><div class="st-bg" id="stBg"></div>
    <div class="st-top"><button class="iconbtn" id="back">${ICON.back}</button><div><b>${esc(st.title)}</b><span id="stN"></span></div>${walletPill()}</div>
    <div class="st-cast">${people.map(a => `<span>${avatar(a)}<small>${esc(a.name)}</small></span>`).join('')}${st.persona ? '' : `<span><span class="av blank">∅</span><small>${Z('你', 'You')}</small></span>`}</div>
    <div class="st-log" id="stLog"></div>
    <div class="st-bottom"><div id="stOpts"></div><form class="say" id="stF"><div class="inbox"><input id="stIn" maxlength="160" autocomplete="off" placeholder="${Z('说一句话，或者（写个动作）', 'Say something, or (do something)')}"><button type="button" class="bulb" id="stShot" title="${Z('生成这一幕的剧照 · ★30', 'Scene still · ★30')}">🎬</button></div><button class="send" type="submit">${ICON.send}</button></form></div></div>`;
  const log = $('#stLog'); let busy = false;
  const bg = () => { const last = [...st.scenes].reverse().find(s => s.frame); $('#stBg').style.backgroundImage = `url("${imgUrl(last ? last.frame : (st.cast[0] || st.persona || {}).face || '')}")`; $('#stBg').classList.toggle('still', !!last); };
  const sceneHtml = (s, i) => `${s.said ? `<div class="st-you">${esc(s.said)}</div>` : ''}<div class="st-scene"><small>${Z(`第 ${i + 1} 幕`, `Scene ${i + 1}`)}${s.place ? ' · ' + esc(s.place) : ''}</small>
    ${s.frame ? `<img class="st-frame" src="${esc(imgUrl(s.frame))}" alt="">` : s.framing ? `<div class="st-framing">${Z('剧照生成中，约 1 分钟…', 'Rendering the still, about a minute…')}</div>` : ''}${s.narration ? `<p class="st-nar">${esc(s.narration)}</p>` : ''}
    ${(s.lines || []).map(l => { const a = face(l.who); return `<div class="st-line">${a ? avatar(a) : `<span class="av blank">${esc((l.who || '?').slice(0, 1))}</span>`}<div><b>${esc(l.who)}</b><p class="en">${esc(l.en)}</p>${lang() === 'zh' && l.zh ? `<p class="zh">${esc(l.zh)}</p>` : ''}</div></div>`; }).join('')}
    ${s.hook ? `<p class="st-hook">${esc(s.hook)}</p>` : ''}</div>`;
  const render = () => { log.innerHTML = st.scenes.map(sceneHtml).join('') + (busy ? `<div class="st-typing"><i></i><i></i><i></i> ${Z('演员们在想下一幕', 'The cast is thinking')}</div>` : '');
    log.scrollTop = log.scrollHeight; $('#stN').textContent = Z(`第 ${st.scenes.length} 幕`, `Scene ${st.scenes.length}`); bg();
    const last = st.scenes[st.scenes.length - 1]; $('#stOpts').innerHTML = !busy && last && (last.options || []).length ? last.options.map((o, k) => `<button class="opt" data-o="${k}"><i>${'AB'[k]}</i>${esc(lang() === 'zh' ? o.zh || o.en : o.en || o.zh)}</button>`).join('') : '';
    $$('[data-o]').forEach(b => b.onclick = () => turn(lang() === 'zh' ? last.options[+b.dataset.o].zh || last.options[+b.dataset.o].en : last.options[+b.dataset.o].en)); };
  async function turn(input){
    if (busy) return; busy = true; const said = (input || '').trim(); if (said) st.scenes.push({said, pending: true}); render();
    try {
      const j = await sapi('/api/stage', {stage: {title: st.title, world: st.world}, persona: st.persona, cast: st.cast, history: st.scenes.filter(s => !s.pending).map(s => ({said: s.said, sum: [s.narration, s.hook].filter(Boolean).join(' ')})), input: said});
      const sc = {said, place: j.place, narration: j.narration, lines: j.lines || [], options: j.options || [], hook: j.hook, beat: j.beat, at: Date.now()};
      if (said) st.scenes[st.scenes.length - 1] = sc; else st.scenes.push(sc);
      st.at = Date.now(); save();
      const g = (j.grow || []).filter(x => x && x.field && x.value);
      if (said){ const c = st.personaId && S.chars[st.personaId]; const tgt = c || (S.blank = S.blank || {growth: [], memories: []});
        tgt.memories = (tgt.memories || []).concat([{drama: st.title, text: `说「${said}」`, at: Date.now()}]).slice(-30);
        if (c){ c.credits = c.credits || {}; c.credits[st.title] = (c.credits[st.title] || 0) + 1; }
        if (g.length){ tgt.pending = (tgt.pending || []).concat(g.map(x => Object.assign(x, {drama: st.title, at: Date.now()}))).slice(-12); growToast(g, c ? st.personaId : null); }
        save(); }
    } catch (e){ if (said) st.scenes.pop(); toast(e.message); }
    busy = false; render();
  }
  $('#stF').onsubmit = e => { e.preventDefault(); const v = $('#stIn').value.trim(); if (!v) return; $('#stIn').value = ''; turn(v); };
  $('#stShot').onclick = () => { const s = st.scenes[st.scenes.length - 1]; if (!s || !s.beat){ toast(Z('先演一幕', 'Play a scene first')); return; } if (s.frame){ toast(Z('这一幕已经有剧照了', 'Already has a still')); return; }
    toast(Z('开始生成剧照 · ★30', 'Rendering still · ★30'));
    if (s.framing) return; s.framing = true; render();
    sapi('/api/frame', {beat: s.beat, place: s.place, cast: people}).then(j => { s.frame = j.url; save(); }).catch(e => toast(e.message)).finally(() => { delete s.framing; render(); }); };
  $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/stage');
  render(); if (!st.scenes.length) turn('');
}

applyStatic();
route();
if (studio()) sapi('/api/me', {}).catch(() => {});  // 同步钱包
})();
