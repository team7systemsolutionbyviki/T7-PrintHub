/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - SERVICE WORKER
   ========================================================================== */

const CACHE_NAME = 'team7-print-v4';

// URLs that must NEVER be intercepted by the Service Worker (causes CORS failures)
const BYPASS_ORIGINS = [
  'firebasestorage.googleapis.com',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'googleapis.com',
  'gstatic.com',
  'firebaseio.com',
  'firebase.com',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Let Firebase/external requests pass through completely — never cache or intercept
  const isBypass = BYPASS_ORIGINS.some(origin => url.hostname.includes(origin));
  if (isBypass || event.request.method !== 'GET') {
    return;
  }

  // Only handle http/https GET requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        }).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('', { status: 404, statusText: 'Not Found' });
    })
  );
});
