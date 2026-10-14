// Service worker minimal (installabilité PWA) : pas de cache hors-ligne, tout passe par le réseau.
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
