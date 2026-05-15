/* Path PWA — service worker.
   Caches all app assets so the app launches and works offline. The Anthropic
   API and Google Fonts CDN are bypassed (fetched live, optionally cached). */
const CACHE = 'path-v18';
const APP_SHELL = [
  './',
  './index.html',
  './paper.html',
  './mono.html',
  './dark.html',
  './playful.html',
  './comfort.js',
  './ai.js',
  './history-curriculum.js',
  './icon.png',
  './icon-192.png',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept the Anthropic API — it's a POST anyway, but be explicit.
  if (url.hostname.endsWith('anthropic.com')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        // Cache successful responses for next time (HTML, JS, fonts, etc.).
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(req, clone).catch(() => {});
          });
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
