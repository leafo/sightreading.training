

const CACHE_VERSION = "v3"
const CACHE_NAME = "st_cache"

const urlsToCache = [ "/" ]

self.addEventListener("install", function(event) {
  event.waitUntil(caches.open(`${CACHE_VERSION}:${CACHE_NAME}`).then(function(cache) {
    return cache.addAll(urlsToCache)
  }))
})

self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.open(`${CACHE_VERSION}:${CACHE_NAME}`).then(function(cache) {
      return fetch(event.request).then(function (response) {
        cache.put(event.request, response.clone())
        return response
      }).catch(function() {
        return cache.match(event.request)
      })
    })
  )
})

self.addEventListener("activate", function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys
      .filter(key => !key.startsWith(CACHE_VERSION))
      .map(key => caches.delete(key))
    )
  }))
})
