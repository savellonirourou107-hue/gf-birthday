const CACHE = 'gf-birthday-v3';
const ASSETS = [
  '/gf-birthday/',
  '/gf-birthday/index.html',
  '/gf-birthday/css/style.css',
  '/gf-birthday/css/optimizations.css',
  '/gf-birthday/js/main.js',
  '/gf-birthday/assets/music/love.mp3',
  '/gf-birthday/assets/images/photo1.jpg',
  '/gf-birthday/assets/images/photo2.jpg',
  '/gf-birthday/assets/images/photo3.jpg',
  '/gf-birthday/assets/images/photo4.jpg',
  '/gf-birthday/assets/images/preview.jpg',
  '/gf-birthday/assets/images/rose-dot.svg',
  '/gf-birthday/assets/images/birthday-cake-illustration.svg',
  '/gf-birthday/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request)
    )
  );
});
