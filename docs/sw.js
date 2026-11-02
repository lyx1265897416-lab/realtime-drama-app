// 重复打开时图片、脚本直接用本机缓存，不再每个文件问一次 GitHub（一次约 0.8 秒）。页面本身总是先走网络，所以更新不会被卡住；视频、音频和中转地址表不经过这里。
const CACHE = 'unscripted-1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range') || /\.(mp4|mp3)$/.test(u.pathname) || u.pathname.endsWith('relays.json') || u.pathname.endsWith('sw.js')) return;
  if (r.mode === 'navigate'){
    e.respondWith(fetch(r).then(x => { if (x.ok){ const copy = x.clone(); caches.open(CACHE).then(c => c.put('page', copy)); } return x; }).catch(() => caches.match('page')));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(async x => {
      if (x.ok){ await c.put(r, x.clone()); (await c.keys()).forEach(k => { const o = new URL(k.url); if (o.pathname === u.pathname && o.search !== u.search) c.delete(k); }); }  // 同一文件的旧版本（?v=）删掉
      return x; });
    if (!hit) return net;
    if (!u.search) e.waitUntil(net.catch(() => {}));  // 没带版本号的图片：先用缓存，后台更新
    return hit;
  }));
});
