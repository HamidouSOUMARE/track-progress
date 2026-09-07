"use client";

import { useEffect, useRef } from "react";

/**
 * Empêche l'écran de s'éteindre tant que l'appel est actif. Le système relâche
 * le verrou dès que la page passe en arrière-plan : on le reprend au retour.
 *
 * Sans support (Safari avant 16.4, navigateurs anciens), le hook ne fait rien —
 * le repos fonctionne, l'écran s'éteint simplement comme avant.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let abandoned = false;

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");

        if (abandoned) {
          await sentinel.release();
          return;
        }

        sentinel.addEventListener("release", () => {
          sentinelRef.current = null;
        });
        sentinelRef.current = sentinel;
      } catch {
        // Refus possible : batterie faible, page masquée. Sans conséquence ici.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && sentinelRef.current === null) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      abandoned = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, [active]);
}
