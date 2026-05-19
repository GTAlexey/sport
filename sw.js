const APP_VERSION = '1.0.33';
const CACHE_PREFIX = 'sport-week-planner-';
const CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;
const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        const oldAppCaches = keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
        return Promise.all(oldAppCaches.map(key => caches.delete(key)))
          .then(() => self.clients.claim())
          .then(() => oldAppCaches.length ? reloadOpenClients() : undefined);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstHtml(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

function networkFirstHtml(request) {
  return fetch(new Request(request, { cache: 'reload' }))
    .then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    })
    .catch(() => caches.match('./index.html'));
}

function cacheFirst(request) {
  return caches.match(request)
    .then(cached => cached || fetch(new Request(request, { cache: 'reload' })).then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }));
}

function reloadOpenClients() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => Promise.all(clients.map(client => client.navigate(client.url).catch(() => undefined))));
}
