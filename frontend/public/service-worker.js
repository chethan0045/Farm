/* KVS Farm PWA service worker — offline shell + safe caching.
 * Navigation = network-first (always fresh index online, cached fallback offline).
 * API = never cached. Static assets = cache-first with background update. */
const CACHE = 'kvs-farm-v4';
// logo.png (~864 KB) is deliberately NOT precached — the fetch handler below
// caches it on first use; precaching it slowed every SW install on mobile.
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never touch cross-origin requests (weather API, fonts, etc.) — network only
  if (url.origin !== self.location.origin) return;

  // Never cache API traffic
  if (url.pathname.startsWith('/api/')) return;

  // SPA navigation: network-first, fall back to cached shell when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // Static assets: cache-first, then network (and cache a copy)
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit)
    )
  );
});
