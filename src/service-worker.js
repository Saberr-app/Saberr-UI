// Intentionally inert: registers only so the browser considers the app installable.
// Network pass-through, caches nothing — no offline mode, no stale-bundle risk.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)));
