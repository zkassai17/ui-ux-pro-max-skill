/**
 * Offline cache. A property manager opens this in a boiler room with no signal,
 * so the app has to run from disk when there's no network.
 *
 * Page loads are network-first: cache-first felt right until it meant every
 * update showed up a visit late, which is worse than a few hundred milliseconds
 * on open. Build assets are content-hashed, so those stay cache-first — if the
 * URL matches, the bytes match.
 */
const CACHE = 'rocksolid-v2'

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

const keep = (req, res) => {
  if (res && res.status === 200 && res.type === 'basic') {
    const copy = res.clone()
    caches.open(CACHE).then((c) => c.put(req, copy))
  }
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  // The page itself: go to the network so a new version appears immediately,
  // and fall back to the cached copy when there is no signal.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => keep(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
    )
    return
  }

  // Everything else: cached bytes are as good as fresh ones.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res))),
  )
})
