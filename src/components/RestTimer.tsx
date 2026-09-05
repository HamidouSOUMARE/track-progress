"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

const TICK_MS = 200;
const RADIUS = 104;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Délai avant de rendre l'écran, une fois le repos écoulé. */
const LINGER_MS = 4000;

/**
 * Plein écran : les chiffres restent lisibles téléphone posé sur le banc. Le
 * décompte s'adosse à un instant de fin, pas à un compteur décrémenté, pour ne
 * pas dériver quand l'écran s'éteint.
 */
export function RestTimer({ rest, onExtend, onDismiss }: RestTimerProps) {
  const reduceMotion = useReducedMotion();
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

  // Une fois le repos écoulé, l'écran se retire seul : on veut la série suivante.
  useEffect(() => {
    if (!rest || !over) {
      return;
    }

    const id = window.setTimeout(onDismiss, LINGER_MS);
    return () => window.clearTimeout(id);
  }, [rest, over, onDismiss]);

  const ratio = rest ? Math.max(0, Math.min(1, remaining / rest.seconds)) : 0;

  return (
    <AnimatePresence>
      {rest ? (
        <motion.div
          role="timer"
          aria-live="off"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-70 flex flex-col items-center justify-center gap-8 bg-base/95 px-6 backdrop-blur-md"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: over
                ? "radial-gradient(60% 40% at 50% 45%, var(--color-accent-soft), transparent 70%)"
                : "radial-gradient(60% 40% at 50% 45%, #1b2230, transparent 70%)",
            }}
          />

          <div className="relative flex flex-col items-center">
            <motion.svg
              viewBox="0 0 240 240"
              className="size-64 sm:size-72"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <circle
                cx="120"
                cy="120"
                r={RADIUS}
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="8"
              />
              <circle
                cx="120"
                cy="120"
                r={RADIUS}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                transform="rotate(-90 120 120)"
                style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear` }}
              />
            </motion.svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <motion.span
                key={over ? "done" : "running"}
                initial={{ scale: over && !reduceMotion ? 0.6 : 1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className={`tabular text-6xl leading-none font-black ${
                  over ? "text-accent" : "text-ink"
                }`}
              >
                {over ? "À toi" : formatCountdown(remaining)}
              </motion.span>
              <span className="text-xs font-medium tracking-[0.2em] text-ink-faint uppercase">
                {over ? "Repos terminé" : "Repos"}
              </span>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-1 text-center">
            {rest.nextName ? (
              <>
                <span className="text-xs tracking-wide text-ink-faint uppercase">Ensuite</span>
                <span className="text-lg font-bold text-ink">{rest.nextName}</span>
              </>
            ) : (
              <span className="text-lg font-bold text-ink">{rest.exerciseName}</span>
            )}
          </div>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => onExtend(30)}
              className="rounded-pill border border-line px-5 py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              +30 s
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-pill bg-accent px-6 py-3 text-sm font-bold text-accent-ink transition-transform active:scale-95"
            >
              {over ? "C'est parti" : "Passer le repos"}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
