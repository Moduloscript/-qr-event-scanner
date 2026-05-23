// Service Worker — Birthday Program PWA
// Cache name includes version for easy cache busting
const CACHE = "birthday-program-v1";
const SHELL = [
  "/download.html",
  "/css/styles.css",
  "/js/download.js",
  "/site.webmanifest",
];

// ── Install: Cache the app shell ──
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      return c.addAll(SHELL);
    }),
  );
  // Activate immediately without waiting for page reload
  self.skipWaiting();
});

// ── Activate: Clean up old caches ──
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
    }),
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Fetch: Network-first, fallback to cache ──
self.addEventListener("fetch", (e) => {
  // Only handle GET requests
  if (e.request.method !== "GET") return;

  // For API requests, try network first, cache the response, fall back to cache
  if (e.request.url.includes("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)),
    );
    return;
  }

  // For static assets (shell), try network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
