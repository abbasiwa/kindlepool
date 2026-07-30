const CACHE = 'kindlepool-v1'
const ASSETS = ['/', '/index.html', '/manifest.json']

// Install: cache core assets
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)),
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
})

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api/')) {
    // Network-first for API requests
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})

// Push notification handler
self.addEventListener('push', (event: any) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const { title, body, icon, tag, url } = data

    const options = {
      body: body ?? '',
      icon: icon ?? '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag ?? 'kindlepool-notification',
      data: { url: url ?? '/' },
      vibrate: [200, 100, 200],
    }

    event.waitUntil(
      self.registration.showNotification(title, options),
    )
  } catch {
    // Simple text fallback
    event.waitUntil(
      self.registration.showNotification('KindlePool', { body: event.data.text() }),
    )
  }
})

// Notification click: navigate to the URL
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const client = windowClients.find((c) => c.url === url)
      if (client) {
        client.focus()
      } else {
        clients.openWindow(url)
      }
    }),
  )
})
