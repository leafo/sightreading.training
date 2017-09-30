

const CACHE_VERSION = "v1"
const CACHE_NAME = "st_cache"

const urlsToCache = [
  "/static/style.css",
  "/static/lib.js",
  "/static/main.js",
  "/static/img/logo.svg",
  "/static/img/logo-small.svg",
  "/static/svg/midi.svg",
]

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
    return fetch(event.request)
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
