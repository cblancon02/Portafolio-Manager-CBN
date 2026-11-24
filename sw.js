self.addEventListener('install', (ev) => self.skipWaiting());
self.addEventListener('activate', (ev) =>
  ev.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('portafolio-manager-')) await caches.delete(k);
      await self.registration.unregister();
    })(),
  ),
);
