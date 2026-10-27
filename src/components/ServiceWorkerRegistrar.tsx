"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/Toast";

/**
 * Enregistre le service worker, qui rend l'app utilisable sans réseau et
 * installable sur l'écran d'accueil. En développement il reste à l'écart : son
 * cache masquerait le rechargement à chaud.
 *
 * Le worker prend la main dès qu'une version sort, mais la page ouverte reste
 * l'ancienne : on propose de recharger plutôt que de le faire à la place de
 * l'utilisateur, qui est peut-être en pleine série.
 */
export function ServiceWorkerRegistrar() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    const container = navigator.serviceWorker;
    // Sans worker aux commandes, c'est une première installation, pas une mise à jour.
    const hadController = Boolean(container.controller);
    let registration: ServiceWorkerRegistration | null = null;

    const onControllerChange = () => {
      if (hadController) {
        setUpdateReady(true);
      }
    };

    // Une app installée reste ouverte des jours : on cherche une mise à jour à
    // chaque retour au premier plan.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {
          // Hors ligne : on réessaiera au prochain retour.
        });
      }
    };

    container.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    container
      .register("/sw.js")
      .then((registered) => {
        registration = registered;
      })
      .catch(() => {
        // Enregistrement refusé : l'app fonctionne, sans le hors-ligne.
      });

    return () => {
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <Toast
      toast={
        updateReady
          ? { key: 0, message: "Nouvelle version prête", actionLabel: "Recharger" }
          : null
      }
      onAction={() => window.location.reload()}
      onDismiss={() => setUpdateReady(false)}
    />
  );
}
