

const CACHE_NAME = "st_cache_1"

const urlsToCache = []

self.addEventListener('install', function(event) {
  console.log("service worker being installed", event)
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(urlsToCache)
  }))
})
