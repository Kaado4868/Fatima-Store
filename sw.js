const CACHE_NAME = 'fatima-store-v2';

const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
  // Removed specific Firebase URLs here because the dynamic fetch handler below 
  // will capture them and their dependencies automatically.
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 1. NAVIGATION: Always serve index.html for navigation (SPA logic)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(e.request).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // 2. ASSETS: Cache First, then Network (and update cache)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Return cached file if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(e.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // CLONE the response (streams can only be read once)
        const responseToCache = networkResponse.clone();

        // Save this new file to cache for next time (Dynamic Caching)
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Network failed and no cache available
        // console.log('Fetch failed:', e.request.url);
      });
    })
  );
});
