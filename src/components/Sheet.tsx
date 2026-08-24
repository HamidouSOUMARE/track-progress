"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Instant du dernier retour déclenché par l'app elle-même. Un retour programmé
 * ne doit pas être confondu avec le geste de l'utilisateur, mais le repère
 * expire : sinon un retour sans effet bloquerait le geste suivant.
 */
let lastProgrammaticBack = 0;
const PROGRAMMATIC_BACK_WINDOW_MS = 100;

/** Feuille modale : ancrée en bas sur mobile, centrée sur grand écran. */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // La fermeture change d'identité à chaque rendu du parent. La garder dans une
  // ref évite de rejouer l'effet — et donc de reprendre le focus au champ en
  // cours de saisie, ce qui referme le clavier sur mobile.
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  /**
   * Le bouton retour du téléphone doit refermer la feuille, pas quitter l'app :
   * on empile une entrée d'historique à l'ouverture et on la retire à la
   * fermeture, d'où qu'elle vienne.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    let closedByBack = false;
    // Une feuille qui s'ouvre rend caduc tout retour programmé en attente.
    lastProgrammaticBack = 0;
    window.history.pushState({ sheet: true }, "");

    const onPopState = () => {
      if (Date.now() - lastProgrammaticBack < PROGRAMMATIC_BACK_WINDOW_MS) {
        lastProgrammaticBack = 0;
        return;
      }

      closedByBack = true;
      closeRef.current();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);

      if (!closedByBack) {
        lastProgrammaticBack = Date.now();
        window.history.back();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-base/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative max-h-[92svh] w-full overflow-y-auto rounded-t-card border border-line bg-surface p-5 shadow-lift outline-none sm:max-w-lg sm:rounded-card"
            initial={{ y: "12%", opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "8%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-4 block h-1 w-10 rounded-pill bg-line sm:hidden"
            />
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
