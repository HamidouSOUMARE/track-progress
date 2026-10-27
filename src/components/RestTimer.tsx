"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DurationPicker } from "@/components/DurationPicker";
import { MAX_REST_SECONDS, formatCountdown } from "@/lib/session";
import { useWakeLock } from "@/lib/use-wake-lock";

interface TimerBase {
  /** Change à chaque nouveau minuteur pour relancer l'animation. */
  key: number;
  message: string;
  /** Contexte sous le message : la série qui arrive, ou ce qu'on prépare. */
  caption: string;
}

/** Repos entre deux séries : un décompte. */
export interface RestPeriod extends TimerBase {
  kind: "rest";
  endsAt: number;
  /** Durée totale, allongée en même temps que `endsAt` par le bouton +30 s. */
  seconds: number;
  /** Le repos qui suit l'échauffement, et non celui entre deux séries. */
  afterWarmup?: boolean;
}

/** Échauffement : sans durée, on s'arrête quand on se sent prêt. Rien n'est enregistré. */
export interface WarmupPeriod extends TimerBase {
  kind: "warmup";
  startedAt: number;
}

export type TimerPeriod = RestPeriod | WarmupPeriod;

const RESTS_AFTER_WARMUP = [0, 60, 120] as const;

interface RestTimerProps {
  rest: TimerPeriod | null;
  /** Repos enchaîné après l'échauffement, réglable depuis son écran. */
  warmupRest: number;
  onWarmupRestChange: (seconds: number) => void;
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
 * pas dériver quand l'écran s'éteint ; l'échauffement, lui, compte depuis son
 * début.
 */
export function RestTimer({
  rest,
  warmupRest,
  onWarmupRestChange,
  onExtend,
  onDismiss,
}: RestTimerProps) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const buzzedRef = useRef<number | null>(null);

  // Tant que le repos est affiché, le téléphone posé sur le banc reste allumé.
  useWakeLock(rest !== null);

  useEffect(() => {
    if (!rest) {
      return;
    }

    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [rest]);

  const warmup = rest?.kind === "warmup";
  const remaining = rest?.kind === "rest" ? (rest.endsAt - now) / 1000 : 0;
  const elapsed = rest?.kind === "warmup" ? Math.max(0, (now - rest.startedAt) / 1000) : 0;
  // Un échauffement n'est jamais « écoulé » : c'est l'utilisateur qui l'arrête.
  const over = !warmup && remaining <= 0;

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

  const ratio =
    rest?.kind === "rest" ? Math.max(0, Math.min(1, remaining / rest.seconds)) : 0;

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
          className="fixed inset-0 z-70 flex flex-col items-center justify-center gap-8 bg-base px-6"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: over
                ? "radial-gradient(55% 35% at 50% 45%, var(--color-accent-soft), transparent 70%)"
                : "radial-gradient(55% 35% at 50% 45%, var(--color-surface-raised), transparent 70%)",
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
              {warmup ? (
                // Pas de fin à montrer : un arc qui tourne dit seulement « en cours ».
                <motion.circle
                  cx="120"
                  cy="120"
                  r={RADIUS}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE * 0.22} ${CIRCUMFERENCE}`}
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
                />
              ) : (
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
              )}
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
                {over
                  ? "À toi"
                  : formatCountdown(warmup ? Math.floor(elapsed) : remaining)}
              </motion.span>
              <span className="max-w-44 text-center text-xs leading-relaxed font-medium tracking-[0.2em] text-ink-faint uppercase">
                {warmup
                  ? "Échauffement"
                  : over
                    ? "Repos terminé"
                    : rest.afterWarmup
                      ? // Trait d'union insécable : la ligne se coupe après « Repos ».
                        "Repos post\u2011échauffement"
                      : "Repos"}
              </span>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-1.5 px-4 text-center">
            <span className="text-xl font-bold text-balance text-ink">{rest.message}</span>
            <span className="text-xs text-ink-faint">{rest.caption}</span>
          </div>

          {warmup ? (
            <div className="relative flex w-full max-w-xs flex-col items-center gap-6">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-pill bg-accent px-8 py-3 text-sm font-bold text-accent-ink transition-transform active:scale-95"
              >
                Fin de l&apos;échauffement
              </button>
              <DurationPicker
                legend="Repos ensuite, avant la première série"
                value={warmupRest}
                presets={RESTS_AFTER_WARMUP}
                max={MAX_REST_SECONDS}
                zeroLabel="Aucun"
                onChange={onWarmupRestChange}
                hint="Rien n'est enregistré : l'échauffement ne compte pas dans ta séance."
              />
            </div>
          ) : (
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
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
