const CACHE_NAME = 'fatima-store-v4.2.0'; // Updated version

// We use specific versions to avoid redirects (which can break caching)
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com', 
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js', // Specific file path
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js', // Specific version
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching assets...');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .catch(err => console.error('Cache failed:', err)) // Log errors if install fails
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
  const url = new URL(e.request.url);

  // 1. IGNORE FIREBASE/GOOGLE APIs
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('firestore') || 
      url.hostname.includes('googleapis')) {
    return;
  }

  // 2. Navigation Fallback (Offline Refresh Fix)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        // If offline, try finding index.html in cache
        return caches.match('./index.html', {ignoreSearch: true})
          .then(response => {
            // If direct match fails, try the root
            return response || caches.match('./', {ignoreSearch: true});
          });
      })
    );
    return;
  }

  // 3. Cache Strategy for other files
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      }).catch(() => {});
    })
  );
});
