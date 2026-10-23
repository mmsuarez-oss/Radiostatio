// Cáscara mínima: existe para que la PWA sea instalable (Chrome exige un
// handler de fetch) y para que abra sin red. Nada de Spotify pasa por acá —
// la API, el SDK y las portadas son otro origen y se dejan pasar derecho.
const CACHE = 'radiostatio-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  // El login vuelve a "/" con ?code=...: la navegación va primero a la red
  // para no servir un shell viejo justo cuando se canjea el token.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copia))
          return res
        })
        .catch(() => caches.match('/').then((r) => r ?? Response.error())),
    )
    return
  }

  // El resto son assets con hash en el nombre: si están, están bien.
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copia))
          }
          return res
        }),
    ),
  )
})
