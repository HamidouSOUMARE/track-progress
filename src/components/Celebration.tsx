"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatDelta } from "@/lib/format";
import type { CelebrationKind } from "@/lib/encouragement";
import type { Unit } from "@/lib/types";

export interface CelebrationPayload {
  /** Change à chaque célébration pour rejouer l'animation. */
  key: number;
  kind: CelebrationKind;
  message: string;
  delta: number;
  unit: Unit;
  exerciseName: string;
}

interface CelebrationProps {
  payload: CelebrationPayload | null;
  onDone: () => void;
}

const DURATION_MS = 2200;
const CONFETTI_COUNT = 26;
const CONFETTI_COLORS = [
  "var(--color-accent)",
  "var(--color-group-pectoraux)",
  "var(--color-group-dos)",
  "var(--color-group-jambes)",
  "var(--color-group-epaules)",
  "var(--color-group-bras)",
];

interface Particle {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
  spin: number;
}

function buildParticles(seed: number): Particle[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => {
    const random = Math.abs(Math.sin(seed + index * 12.9898) * 43758.5453) % 1;
    return {
      angle: (index / CONFETTI_COUNT) * Math.PI * 2 + random,
      distance: 120 + random * 160,
      size: 6 + random * 8,
      delay: random * 0.12,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
      spin: random > 0.5 ? 240 : -240,
    };
  });
}

export function Celebration({ payload, onDone }: CelebrationProps) {
  const reduceMotion = useReducedMotion();
  const particles = useMemo(() => buildParticles(payload?.key ?? 0), [payload?.key]);

  useEffect(() => {
    if (!payload) {
      return;
    }
    const timer = window.setTimeout(onDone, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [payload, onDone]);

  return (
    <AnimatePresence>
      {payload ? (
        <motion.div
          key={payload.key}
          className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onDone}
          role="status"
          aria-live="polite"
        >
          <div className="relative flex flex-col items-center gap-3 px-6 text-center">
            {!reduceMotion &&
              particles.map((particle, index) => (
                <motion.span
                  key={index}
                  className="pointer-events-none absolute top-1/2 left-1/2 block rounded-[2px]"
                  style={{
                    width: particle.size,
                    height: particle.size * 0.6,
                    backgroundColor: particle.color,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{
                    x: Math.cos(particle.angle) * particle.distance,
                    y: Math.sin(particle.angle) * particle.distance + 60,
                    opacity: 0,
                    rotate: particle.spin,
                    scale: 0.6,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: particle.delay,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              ))}

            <motion.p
              className="text-sm font-medium tracking-wide text-ink-muted uppercase"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              {payload.exerciseName}
            </motion.p>

            <motion.p
              className="tabular text-6xl font-black text-accent drop-shadow-[0_8px_30px_var(--color-accent-soft)]"
              initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
            >
              {payload.delta > 0 ? formatDelta(payload.delta, payload.unit) : "✓"}
            </motion.p>

            <motion.p
              className="text-xl font-bold text-ink"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              {payload.message}
            </motion.p>

            {payload.kind === "record" ? (
              <motion.span
                className="rounded-pill bg-accent px-3 py-1 text-xs font-bold text-accent-ink uppercase"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.22, type: "spring", stiffness: 400, damping: 14 }}
              >
                Record personnel
              </motion.span>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
