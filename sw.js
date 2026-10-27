// One-Minute Page (Claro) — offline service worker. STAGED.
// Lives next to the app document (in production: the repo root,
// beside index.html; in the candidate preview: beside
// index-ai-candidate.html). Its scope is its own directory, which
// covers the app page.
//
// Strategy: cache-first for same-origin GETs. The app page itself
// is added to the cache by the page (it knows its own URL) as soon
// as this worker is ready; every other same-origin GET is cached
// opportunistically as it is fetched. With the document cached,
// the app reopens and runs with no internet: page creation, photo
// attach, on-device video, and the built-in presenter are all
// local. AI service calls are POSTs — never intercepted here —
// and the app labels them as requiring internet when offline.
//
// Version history:
//   v2 (2026-10-27 repair pass) — cache name bumped so a phone that
//      cached candidate v1 drops the old document: on activate,
//      every cache other than the current one is deleted, so the
//      next ONLINE open fetches and caches the corrected document.
//      The founder's first re-test open must be online.
const CACHE = "claro-omp-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n !== CACHE)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline and not an exact cache hit: for a navigation,
          // serve any cached app document we hold.
          if (req.mode === "navigate") {
            return caches
              .open(CACHE)
              .then((c) => c.keys())
              .then((keys) => {
                const doc = keys.find(
                  (k) => /\.html($|\?)/.test(k.url) || k.url.endsWith("/")
                );
                return doc ? caches.match(doc) : Response.error();
              });
          }
          return Response.error();
        });
    })
  );
});
