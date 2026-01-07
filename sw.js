const CACHE_NAME = 'fatima-store-v4.4';

// Only LOCAL assets
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// INSTALL
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore auth & APIs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  // Navigation fallback (offline page load)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for same-origin assets
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        return (
          cached ||
          fetch(req).then(res => {
            // Only cache valid responses
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
            }
            return res;
          })
        );
      })
    );
  }
});
