/* ==========================================================================
   T7-PRINT HUB - SERVICE WORKER
   Cache Version: v5
   ========================================================================== */

const CACHE_NAME = 't7-printhub-v5';

// Firebase and external services that must NEVER be intercepted
const BYPASS_ORIGINS = [
  'firebasestorage.googleapis.com',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'googleapis.com',
  'gstatic.com',
  'firebaseio.com',
  'firebase.com'
];

// INSTALL
self.addEventListener('install', (event) => {
  console.log('[SW] Installing T7-PrintHub v5');

  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            }
            return null;
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS GET requests
  if (
    request.method !== 'GET' ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // Never intercept Firebase / Google API requests
  const isBypass = BYPASS_ORIGINS.some((origin) =>
    url.hostname.includes(origin)
  );

  if (isBypass) {
    return;
  }

  /*
   * IMPORTANT:
   * Always get HTML/navigation requests from the network first.
   * This prevents old website branding from being served from cache.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);

          if (cached) {
            return cached;
          }

          return new Response(
            'Offline - Please check your internet connection.',
            {
              status: 503,
              headers: {
                'Content-Type': 'text/plain'
              }
            }
          );
        })
    );

    return;
  }

  /*
   * For CSS, JS, images and other files:
   * Network first → cache fallback.
   */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          }).catch(() => { });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        return new Response('', {
          status: 404,
          statusText: 'Not Found'
        });
      })
  );
});