const CACHE_NAME = 'fatima-store-v1.1.1';

// 1. CORE ASSETS: These MUST be cached or the app won't open.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// 2. EXTERNAL ASSETS: We TRY to cache these for offline use.
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest', 
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/chart.js', // Added this so charts work offline
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Instantly take over
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Step A: Cache Core Files (Vital)
      try {
        await cache.addAll(CORE_ASSETS);
        console.log(`[SW] ${CACHE_NAME} Core assets cached.`);
      } catch (err) {
        console.error('[SW] Core assets failed:', err);
      }

      // Step B: Cache External Files (Best Effort)
      // We process these one by one so one failure doesn't stop the rest
      for (const url of EXTERNAL_ASSETS) {
        try {
          const request = new Request(url, { mode: 'cors' });
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (err) {
          // It's okay if these fail (e.g., if offline during install)
          console.warn('[SW] Failed to cache external asset:', url);
        }
      }
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
  self.clients.claim(); // Immediately control the page
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. IGNORE FIREBASE/GOOGLE APIs (Crucial for Auth & Database)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('firestore') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google.com')) {
    return;
  }

  // 2. Navigation Fallback (SPA Logic)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match('./index.html', {ignoreSearch: true})
          .then(response => response || caches.match('./', {ignoreSearch: true}));
      })
    );
    return;
  }

  // 3. Cache Strategy for other files
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then((cachedResponse) => {
      // Return cached file if found, otherwise fetch from net
      return cachedResponse || fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      }).catch(() => null);
    })
  );
});
