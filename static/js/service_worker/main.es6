

const CACHE_VERSION = "v1"
const CACHE_NAME = "st_cache"

const urlsToCache = [ "/" ]

self.addEventListener("install", function(event) {
  event.waitUntil(caches.open(`${CACHE_VERSION}:${CACHE_NAME}`).then(function(cache) {
    return cache.addAll(urlsToCache)
  }))
})

self.addEventListener("fetch", function(event) {

  event.respondWith(caches.match(event.request).then(function (response) {
    if (response) {
      return response
    }

    return fetch(event.request).then(function (response) {
      return caches.open(`${CACHE_VERSION}:${CACHE_NAME}`).then(function(cache) {
        cache.put(event.request, response.clone())
        return response
      })
    })
  }))
})

self.addEventListener("activate", function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys
      .filter(key => !key.startsWith(CACHE_VERSION))
      .map(key => caches.delete(key))
    )
  }))
})
