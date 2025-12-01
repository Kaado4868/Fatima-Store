const CACHE_NAME = 'fatima-store-v3'; // Version 3

// ONLY cache local files during install. 
// This prevents the "Installation Failed" error if internet is weak.
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching critical local assets');
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
  self.clients.claim(); // Take control immediately
});

self.addEventListener('fetch', (e) => {
  // 1. NAVIGATION (The HTML Page)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(e.request).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // 2. ALL OTHER ASSETS (Images, CSS, JS, Tailwind, Firebase)
  // Strategy: Cache First, Then Network, Then Fail gracefully
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // Clone and Cache automatically
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Silent fail for images/fonts if offline and not cached
      });
    })
  );
});
