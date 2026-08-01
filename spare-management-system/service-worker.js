const CACHE_NAME = "sms-offline-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles/base.css",
  "./styles/layout.css",
  "./styles/components.css",
  "./styles/themes.css",
  "./src/app.js",
  "./src/router.js",
  "./src/config/firebase-config.js",
  "./src/services/firebase.js",
  "./src/services/auth.js",
  "./src/services/database.js",
  "./src/services/rbac.js",
  "./src/services/audit.js",
  "./src/services/inventory.js",
  "./src/services/file.js",
  "./src/services/reports.js",
  "./src/services/qr.js",
  "./src/services/scanner.js",
  "./src/ui/sidebar.js",
  "./src/ui/table.js",
  "./src/ui/toast.js",
  "./src/modules/dashboard.js",
  "./src/modules/inventory.js",
  "./src/modules/receive.js",
  "./src/modules/issue.js",
  "./src/modules/purchase.js",
  "./src/modules/vendors.js",
  "./src/modules/analytics.js",
  "./src/modules/reports.js",
  "./src/modules/qr-management.js",
  "./src/modules/audit-log.js",
  "./src/modules/settings.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
