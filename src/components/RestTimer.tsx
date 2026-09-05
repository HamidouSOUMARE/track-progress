"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatCountdown } from "@/lib/session";

export interface RestPeriod {
  /** Change à chaque nouveau repos pour relancer l'animation. */
  key: number;
  endsAt: number;
  seconds: number;
  exerciseName: string;
  nextName: string | null;
}

interface RestTimerProps {
  rest: RestPeriod | null;
  onExtend: (seconds: number) => void;
  onDismiss: () => void;
}

const TICK_MS = 250;

/**
 * Décompte adossé à un instant de fin plutôt qu'à un compteur décrémenté :
 * l'écran peut s'éteindre ou l'onglet passer en arrière-plan sans dériver.
 */
export function RestTimer({ rest, onExtend, onDismiss }: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const buzzedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) {
      return;
    }

    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [rest]);

  const remaining = rest ? (rest.endsAt - now) / 1000 : 0;
  const over = remaining <= 0;

  useEffect(() => {
    if (!rest || !over || buzzedRef.current === rest.key) {
      return;
    }

    buzzedRef.current = rest.key;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([30, 80, 30]);
    }
  }, [rest, over]);

  const ratio = rest ? Math.max(0, Math.min(1, remaining / rest.seconds)) : 0;

  return (
    <AnimatePresence>
      {rest ? (
        <motion.div
          role="timer"
          aria-live="off"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed inset-x-4 bottom-4 z-55 mx-auto max-w-sm overflow-hidden rounded-card border border-line bg-surface-raised shadow-lift"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span
              className={`tabular text-2xl leading-none font-black ${
                over ? "text-accent" : "text-ink"
              }`}
            >
              {formatCountdown(remaining)}
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-semibold text-ink-muted">
                {over ? "Repos terminé" : "Repos"}
              </span>
              <span className="truncate text-xs text-ink-faint">
                {rest.nextName ? `Ensuite : ${rest.nextName}` : rest.exerciseName}
              </span>
            </span>

            <button
              type="button"
              onClick={() => onExtend(30)}
              className="shrink-0 rounded-pill border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              +30 s
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Arrêter le repos"
              className="flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div aria-hidden="true" className="h-1 bg-line">
            <motion.div
              className={over ? "h-full bg-accent" : "h-full bg-ink-faint"}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
