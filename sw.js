/* EDS O2-Planung — Service Worker: App-Hülle offline verfügbar.
 * VERSION muss zu js/version.js passen (ein Test prüft das): neue Version → neuer Cache, alte werden gelöscht.
 * Statische Dateien: zuerst Netz (damit Aktualisierungen sofort ankommen), bei Ausfall der Cache.
 * Aufrufe des Speicher-Servers (anderer Ursprung) laufen immer über das Netz. */
const VERSION = 'o2-v0.3.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/print.css', 'img/wicki-logo.png',
  'icons/favicon.svg', 'icons/favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/config.js', 'js/version.js', 'js/app.js', 'js/model.js', 'js/units.js', 'js/i18n.js', 'js/store.js', 'js/vendor/qrcode.js',
  'fonts/ibm-plex-mono-latin-400-normal.woff2', 'fonts/ibm-plex-mono-latin-600-normal.woff2', 'fonts/ibm-plex-mono-latin-700-normal.woff2',
  'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-600-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((c) => c || caches.match('index.html'))),
  );
});
