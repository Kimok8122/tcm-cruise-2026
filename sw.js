const RELEASE = '2026-10-06-v8';
const CACHE = 'kimo-ken-tcm-' + RELEASE;
const ROOT = new URL('./', self.location.href);
const FILES = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'schedule.pdf'];
const URLS = FILES.map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Fail the install if any required file is unavailable. Never claim a partial save.
    for (const url of URLS) {
      const response = await fetch(new Request(url, {cache:'reload'}));
      if (!response.ok) throw new Error('Missing offline file');
      await cache.put(url, response);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('kimo-ken-tcm-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Serve the installed app as one consistent release, including offline navigations.
    if (event.request.mode === 'navigate' && (url.pathname === ROOT.pathname || url.pathname === new URL('index.html', ROOT).pathname)) {
      return await cache.match(URLS[0]) || fetch(event.request);
    }
    return await cache.match(event.request, {ignoreSearch:true}) || fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_CACHE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const saved = await Promise.all(URLS.map(url => cache.match(url)));
    event.ports[0].postMessage({release:RELEASE, ready:saved.every(Boolean)});
  })());
});
