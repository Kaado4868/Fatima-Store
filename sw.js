const CACHE_NAME = 'fatima-store-final-v12';

// Files to save immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  // Firebase SDKs
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force new worker to active immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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
  self.clients.claim(); // Take control of all pages immediately
});

self.addEventListener('fetch', (e) => {
  // 1. NAVIGATION REQUESTS (Refreshing the page)
  // If the user tries to reload the page, serve index.html from cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(e.request);
      }).catch(() => {
        // If both fail (offline + not in cache), try finding the root
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 2. ALL OTHER REQUESTS (Images, Scripts, Styles)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
