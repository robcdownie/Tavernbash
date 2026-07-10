/* Cache-first service worker. Bump CACHE_V on every deploy that must
   invalidate old assets; the activate step deletes stale caches. */
const CACHE_V = 'bb-v18';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_V).then(function (c) {
    return c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']);
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  /* network-first for navigations so a new deploy is picked up promptly,
     cache-first for hashed assets which never change under one name */
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(function (r) {
      const copy = r.clone();
      caches.open(CACHE_V).then(function (c) { c.put('/', copy); });
      return r;
    }).catch(function () { return caches.match('/'); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (r) {
      const copy = r.clone();
      caches.open(CACHE_V).then(function (c) { c.put(e.request, copy); });
      return r;
    });
  }));
});
