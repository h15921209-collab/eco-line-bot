// 停用所有離線快取，全量直通即時網路，並清除既有過期快取
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    })
  );
  self.clients.claim();
});

// 所有請求 100% 直通網路，嚴禁讀取本地快取
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
