// Caches the site so ScholarAce opens on weak networks.
const CACHE = 'scholarace-shell-v3';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/config.js', 'js/data/questions.js', 'js/library.js', 'js/codes.js', 'js/crypto.js', 'js/store.js', 'js/core.js', 'js/pages.js', 'js/exam.js', 'js/boot.js', 'icon.svg', 'brand/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || /\.pdf$/i.test(url.pathname) || e.request.headers.has('range')) return; // never intercept big downloads
  // network first so updates (new questions, new codes) show up; fall back to the cache when offline
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); return res;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
