"use client";

import { AnimatePresence, motion } from "motion/react";

export interface ToastMessage {
  /** Change à chaque notification pour relancer le compte à rebours. */
  key: number;
  message: string;
  actionLabel?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onAction: () => void;
  onDismiss: () => void;
}

/** Barre flottante : elle passe au-dessus des feuilles modales, sans décaler la page. */
export function Toast({ toast, onAction, onDismiss }: ToastProps) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.key}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed inset-x-4 bottom-4 z-60 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-card border border-line bg-surface-raised px-4 py-3 shadow-lift"
        >
          <span className="text-sm text-ink">{toast.message}</span>
          {toast.actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 rounded-pill px-3 py-1.5 text-sm font-bold text-accent transition-colors hover:bg-accent-soft"
            >
              {toast.actionLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Masquer le message"
              className="shrink-0 rounded-pill px-2 py-1 text-ink-faint transition-colors hover:text-ink"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
