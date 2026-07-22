const CACHE_NAME = "reiz-pulse-cache-v1";
const OFFLINE_URL = "/offline.html";

const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip API requests
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("/_next/webpack-hmr")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Check if response is valid
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Dynamically cache page requests
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If fetch fails (offline) and not cached, return the offline shell
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
