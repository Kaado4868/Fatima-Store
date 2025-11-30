const CACHE_NAME = 'price-keeper-offline-v1';

// 1. Files we KNOW we need immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  // FIREBASE CORE FILES (The Brain)
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js'
];

// 2. Install Event: Cache known files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Force new worker to take over
});

// 3. Activate Event: Clean up old caches
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

// 4. Fetch Event: The "Offline Magic"
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // A. If found in cache, use it!
      if (cachedResponse) {
        return cachedResponse;
      }

      // B. If not found, go to network
      return fetch(e.request).then((networkResponse) => {
        // Check if response is valid
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // C. Save this new file to cache for next time
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // D. If offline and file missing, just return nothing (or a fallback)
        // This prevents the app from crashing on missing analytics, etc.
      });
    })
  );
});
