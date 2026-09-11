"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker, qui rend l'app utilisable sans réseau et
 * installable sur l'écran d'accueil. En développement il reste à l'écart : son
 * cache masquerait le rechargement à chaud.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Enregistrement refusé : l'app fonctionne, sans le hors-ligne.
    });
  }, []);

  return null;
}
