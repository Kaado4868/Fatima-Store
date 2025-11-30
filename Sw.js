const CACHE_NAME = 'price-keeper-v3'; // BUMPED VERSION TO FORCE UPDATE
const ASSETS = [
  './',
  './index.html',
  'https://kaado4868.github.io/Fatima-Store/manifest.json',
  'https://kaado4868.github.io/Fatima-Store/logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
