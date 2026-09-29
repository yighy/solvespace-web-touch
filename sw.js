// Service worker: caches SolveSpace for offline use and adds the COOP/COEP headers
// that GitHub Pages cannot send. Without them there is no SharedArrayBuffer, and the
// web edition (built with threads) does not start.
const CACHE = 'solvespace-20260930-0900';
const CORE = [
  './', 'index.html', 'solvespace.js', 'solvespace.wasm', 'solvespace.data',
  'solvespaceui.js', 'solvespaceui.css', 'filemanagerui.js',
  'android.js', 'coi-sw.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the browser's HTTP cache (GitHub Pages allows 10 min of
  // caching), otherwise a new version could be filled with the previous files.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isolate = r => {
  if (!r || r.status === 0) return r; // opaque response: headers cannot be changed
  const h = new Headers(r.headers);
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Embedder-Policy', 'credentialless');
  h.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let r = await cache.match(req, { ignoreSearch: true });
    if (!r) {
      try {
        r = await fetch(req);
        // Font Awesome (other origin): cached too, for offline use
        if (r.ok || r.type === 'opaque') cache.put(req, r.clone());
      } catch (err) {
        if (req.mode === 'navigate') r = await cache.match('index.html');
        if (!r) throw err;
      }
    }
    return sameOrigin ? isolate(r) : r;
  })());
});
