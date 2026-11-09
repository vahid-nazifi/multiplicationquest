// Multiplication Quest - Service Worker
// Handles offline caching and background sync

const CACHE_NAME = 'mquest-v1.0.0';
const OFFLINE_URL = './index.html';

// All assets to cache on install
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/animations.css',
  './css/components.css',
  './css/screens.css',
  './js/storage.js',
  './js/progress.js',
  './js/achievements.js',
  './js/audio.js',
  './js/adaptive.js',
  './js/game.js',
  './js/mascot.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// External resources to cache (fonts)
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap',
  'https://fonts.gstatic.com/s/fredokaone/v14/k3kUo8kEI-tA1RRcTZGmTlHGCaen8wf-.woff2',
  'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDOUhdTO3ew.woff2',
];

// ==========================================
// INSTALL EVENT - Cache all static assets
// ==========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Multiplication Quest v1.0.0...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Caching static assets...');
      // Cache static assets (ignore failures on individual files)
      await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Failed to cache: ${url}`, err))
        )
      );
      // Try to cache fonts
      await Promise.allSettled(
        FONT_URLS.map(url =>
          fetch(url, { mode: 'no-cors' })
            .then(res => cache.put(url, res))
            .catch(err => console.warn(`[SW] Could not cache font: ${url}`, err))
        )
      );
      console.log('[SW] Cache complete!');
    }).then(() => self.skipWaiting())
  );
});

// ==========================================
// ACTIVATE EVENT - Clean up old caches
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log('[SW] Activated!');
      return self.clients.claim();
    })
  );
});

// ==========================================
// FETCH EVENT - Cache-first strategy
// ==========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // For navigation requests (HTML pages), use network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline: serve cached page
          return caches.match(OFFLINE_URL) || caches.match('./index.html');
        })
    );
    return;
  }

  // For Google Fonts and other external resources: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // For all other requests: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(err => {
        console.warn('[SW] Fetch failed for:', request.url, err);
        // Return a basic offline response for assets
        return new Response('', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// ==========================================
// MESSAGE EVENT - Handle cache updates
// ==========================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
