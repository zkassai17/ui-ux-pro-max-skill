/**
 * Offline cache. A property manager opens this in a boiler room with no signal,
 * so the app shell has to come from disk, not the network.
 *
 * App shell is cache-first and refreshed in the background; everything else
 * falls back to cache only when the network is unavailable. Bumping CACHE
 * retires the previous version on activate.
 */
const CACHE = 'rocksolid-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', './index.html', './manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  e.respondWith(
    caches.match(req).then((hit) => {
      const live = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => hit)
      // Serve from disk instantly when we have it; refresh behind the scenes.
      return hit || live
    }),
  )
})
