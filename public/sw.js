/*
 * Service worker de TrackProgress.
 *
 * Écrit à la main : l'app est entièrement statique et ne parle à aucune API,
 * donc quelques règles suffisent — et il n'y a rien à resuivre à chaque montée
 * de version de Next.
 *
 * Le piège d'un service worker est de servir une version périmée pour
 * toujours. Trois garde-fous ici : le réseau fait foi pour la page, le cache
 * est versionné et les anciens sont supprimés, et la nouvelle version prend la
 * main sans attendre la fermeture des onglets.
 */

const CACHE = "track-progress-v1";
const FALLBACK = "/";
const SHELL = [FALLBACK, "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** On ne touche ni aux autres domaines ni aux requêtes qui modifient l'état. */
function isCacheable(request) {
  return request.method === "GET" && new URL(request.url).origin === self.location.origin;
}

/** Page : le réseau fait foi, le cache ne sert que s'il est injoignable. */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = (await caches.match(request)) ?? (await caches.match(FALLBACK));

    if (cached) {
      return cached;
    }

    throw error;
  }
}

/** Fichiers dont le nom porte déjà une empreinte : le cache fait foi. */
async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (!isCacheable(request)) {
    return;
  }

  event.respondWith(request.mode === "navigate" ? networkFirst(request) : cacheFirst(request));
});
