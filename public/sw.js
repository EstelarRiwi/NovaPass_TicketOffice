self.addEventListener('install', e => e.waitUntil(caches.open('v1').then(() => self.skipWaiting())))
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))))
