

const CACHE_NAME = "st_cache_1"

const urlsToCache = [
  "/static/style.css",
  "/static/lib.js",
  "/static/main.js",
  "/static/img/logo.svg",
  "/static/img/logo-small.svg",
  "/static/svg/midi.svg",
]

self.addEventListener("install", function(event) {
  console.log("service worker being installed", event)
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
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
