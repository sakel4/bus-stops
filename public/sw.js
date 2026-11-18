// HopOn service worker: makes repeat visits faster and lets the app open with a weak or no
// connection. Registered from src/layouts/Layout.astro (production builds only).
//
//   /_astro/*, images  cache first     file names change on every build, so a copy never goes stale
//   pages              network first   always fresh online; the saved copy after 4 s or offline
//   /api/*, other sites not handled    live arrivals and map tiles always come from the network
//
// Served with "Cache-Control: no-cache" (vercel.json), so browsers pick up a new version on the
// next visit. To reset every cache, bump VERSION. To remove the service worker from all users,
// see "Service worker" in the README.

const VERSION = 'v1';
const ASSETS = `assets-${VERSION}`;
const PAGES = `pages-${VERSION}`;
/** Pages kept for offline use, most recently visited first (there are over 1,000 stop pages). */
const MAX_PAGES = 30;
/** After this, a page request falls back to its saved copy (weak signal at the bus stop). */
const NETWORK_TIMEOUT_MS = 4000;
const OFFLINE_PAGES = ['/offline/', '/en/offline/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      // Bypass the HTTP cache so the offline pages match this deploy.
      await cache.addAll(OFFLINE_PAGES.map((url) => new Request(url, { cache: 'reload' })));
      // Take over right away: pages always come from the network, so mixing versions is safe.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== ASSETS && key !== PAGES) await caches.delete(key);
      }
      // Start the page request while the service worker is still starting up.
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Other sites (map tiles, Ko-fi) and live data: let the browser handle them as usual.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, url));
  } else if (url.pathname.startsWith('/_astro/') || /\.(png|jpe?g|webp|ico|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(event, url) {
  const cache = await caches.open(PAGES);
  // One copy per page: "/?x=1" and "/" are the same page here.
  const key = url.origin + url.pathname;

  const network = (async () => {
    const response = (await event.preloadResponse) ?? (await fetch(event.request));
    // Only save real pages (not errors or redirects).
    if (response.ok && response.type === 'basic') {
      await cache.put(key, response.clone());
      await trim(cache);
    }
    return response;
  })();
  // Let a slow response finish and be saved even after the saved copy was shown.
  event.waitUntil(network.catch(() => {}));

  try {
    return await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)]);
  } catch (error) {
    const cached = await cache.match(key);
    if (cached) return cached;
    // Slow but not offline, and nothing saved: keep waiting for the network.
    if (error === TIMEOUT) {
      try {
        return await network;
      } catch {
        // Fall through to the offline page.
      }
    }
    return (await cache.match(offlinePageFor(url))) ?? Response.error();
  }
}

const TIMEOUT = new Error('timeout');

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(TIMEOUT), ms));
}

function offlinePageFor(url) {
  const english = url.pathname === '/en' || url.pathname.startsWith('/en/');
  return url.origin + (english ? '/en/offline/' : '/offline/');
}

/** Drops the oldest saved pages beyond MAX_PAGES. Never drops the offline pages. */
async function trim(cache) {
  const pages = (await cache.keys()).filter(
    (request) => !OFFLINE_PAGES.includes(new URL(request.url).pathname),
  );
  // Cache keys keep insertion order, and saving a page again moves it to the end.
  for (const request of pages.slice(0, Math.max(0, pages.length - MAX_PAGES))) {
    await cache.delete(request);
  }
}
