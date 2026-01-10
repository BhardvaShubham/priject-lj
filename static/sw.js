// static/sw.js
// IMCS Service Worker — industrial-safe offline strategy

const CACHE_NAME = 'imcs-static-v1';
const API_CACHE = 'imcs-api-v1';

const ASSETS = [
  '/',
  '/dashboard',
  '/static/css/sap90.css',
  '/static/js/app.js',
  '/static/js/lazy.js',
  '/static/icons/logo-imcs.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const allowed = [CACHE_NAME, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.map(k => !allowed.includes(k) && caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // API: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(API_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached =>
            cached || new Response(
              JSON.stringify({ error: 'offline' }),
              { headers: { 'Content-Type': 'application/json' } }
            )
          )
        )
    );
    return;
  }

  // Charts: stale-while-revalidate
  if (url.pathname.startsWith('/chart/')) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req)
          .then(res => {
            if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
            return res;
          })
          .catch(() => null);
        return cached || network;
      })
    );
    return;
  }

  // Static: cache-first
  event.respondWith(
    caches.match(req).then(
      cached => cached || fetch(req)
    )
  );
});
