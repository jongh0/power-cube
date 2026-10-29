const CACHE_NAME = 'powercube-cache-v1.4.2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=1.4.2',
  './app.js?v=1.4.2',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 설치 시 정적 파일 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 활성화 시 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Vercel API 요청 (실시간 충전 현황): Network-First
  if (url.pathname.includes('/api/status')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 성공적인 응답은 캐시에 보관 (오프라인 대비)
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 직전에 캐시된 API 데이터 반환
          return caches.match(event.request);
        })
    );
    return;
  }

  // 정적 에셋: Stale-While-Revalidate (캐시 먼저 즉시 응답 + 백그라운드 갱신)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        // 오프라인 fallback
      });

      return cachedResponse || fetchPromise;
    })
  );
});
