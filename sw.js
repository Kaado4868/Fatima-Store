const CACHE_NAME = 'fatima-store-v17-final'; // Version 17

const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// Install: Cache critical files immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(' caching critical assets');
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Take control immediately
});

// Fetch: The Offline Logic
self.addEventListener('fetch', (event) => {
  // A. Navigation (Page Load/Refresh): Always return index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(event.request).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // B. Other Assets: Cache-First Strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Optional: Cache new dynamic files here if needed
        return networkResponse;
      });
    })
  );
});
