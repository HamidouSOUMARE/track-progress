"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DeltaBadge } from "@/components/DeltaBadge";
import { Sparkline } from "@/components/Sparkline";
import { getMuscleGroup } from "@/data/muscle-groups";
import { formatRelativeDate, formatWithUnit, unitSuffix } from "@/lib/format";
import { computeProgress, toSeries } from "@/lib/progress";
import type { Exercise, Tracking } from "@/lib/types";

interface ExerciseCardProps {
  exercise: Exercise;
  tracking: Tracking | undefined;
  onOpen: (exerciseId: string) => void;
}

export function ExerciseCard({ exercise, tracking, onOpen }: ExerciseCardProps) {
  const group = getMuscleGroup(exercise.group);
  const accent = `var(${group.accent})`;
  const progress = tracking ? computeProgress(tracking, exercise.goal) : null;
  const atBest = progress !== null && progress.current === progress.best && progress.gain > 0;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(exercise.id)}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-5 text-left shadow-card transition-colors hover:border-ink-faint/40 hover:bg-surface-raised"
      aria-label={`${exercise.name} — ${
        progress ? formatWithUnit(progress.current, exercise.unit) : "aucune référence"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-ink-faint uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-pill"
              style={{ backgroundColor: accent }}
            />
            {group.label}
            {exercise.note ? (
              <span className="text-ink-muted" title="Note enregistrée">
                <svg
                  viewBox="0 0 16 16"
                  className="size-3"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M3 4h10M3 8h10M3 12h6" />
                </svg>
                <span className="sr-only">Note enregistrée</span>
              </span>
            ) : null}
          </span>
          <h3 className="text-base leading-snug font-semibold text-ink">{exercise.name}</h3>
        </div>

        {atBest ? (
          <span
            className="rounded-pill bg-accent-soft px-2 py-1 text-[0.65rem] font-bold text-accent uppercase"
            title="Meilleur résultat enregistré"
          >
            {exercise.kind === "mesure" ? "Meilleur" : "Record"}
          </span>
        ) : null}
      </header>

      {tracking && progress ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-1.5">
              <AnimatedNumber
                value={progress.current}
                className="tabular text-4xl leading-none font-black text-ink"
              />
              <span className="text-sm font-semibold text-ink-muted">
                {unitSuffix(exercise.unit)}
              </span>
            </p>
            <DeltaBadge
              delta={progress.delta}
              gain={progress.gain}
              ratio={progress.ratio}
              unit={exercise.unit}
            />
          </div>

          <Sparkline values={toSeries(tracking)} color={accent} className="h-9 w-full" />

          <footer className="flex items-center justify-between gap-2 text-xs text-ink-faint">
            <span>Référence {formatWithUnit(progress.reference, exercise.unit)}</span>
            <span>
              {progress.lastUpdate
                ? `Maj ${formatRelativeDate(progress.lastUpdate)}`
                : "Jamais mis à jour"}
            </span>
          </footer>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">
            {exercise.kind === "mesure"
              ? "Prends une première mesure : elle servira de point de départ."
              : "Enregistre ta charge de référence pour commencer à suivre ta progression."}
          </p>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            Définir la référence
          </span>
        </div>
      )}
    </motion.button>
  );
}
