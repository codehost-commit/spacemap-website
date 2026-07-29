// SpaceMap service worker — network-first for the app shell, cache-first for
// heavy static assets (Cesium chunks, GLB models, bundled TLE snapshot).
// Bumping the CACHE_VERSION invalidates all previous caches on next load.
const CACHE_VERSION = 'spacemap-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URL_SUFFIXES = [
  '/models/iss.glb',
  '/models/hubble.glb',
  '/models/voyager.glb',
  '/data/tles.txt',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      const base = new URL('./', self.location).pathname;
      return Promise.allSettled(
        PRECACHE_URL_SUFFIXES.map((suffix) =>
          cache.add(new Request(base.replace(/\/$/, '') + suffix)),
        ),
      );
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Don't touch third-party APIs (tile providers, CelesTrak, YouTube, etc.).
  if (url.origin !== self.location.origin) return;

  // Cache-first for durable assets.
  const durable =
    url.pathname.endsWith('.glb') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.includes('/cesium/') ||
    url.pathname.includes('/data/tles.txt');

  if (durable) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Network-first for the shell; fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? Response.error())),
  );
});
