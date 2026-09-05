"use client";

import { AnimatePresence, motion } from "motion/react";
import { formatValue, formatWithUnit } from "@/lib/format";
import { targetSets } from "@/lib/session";
import type { Exercise, SetLog } from "@/lib/types";

interface SeriesPanelProps {
  exercise: Exercise;
  /** Séries déjà validées pour la séance du jour. */
  series: SetLog[];
  /** Répétitions proposées pour la série en cours. */
  reps: string;
  onRepsChange: (reps: string) => void;
  onValidate: () => void;
  onRemoveLast: () => void;
  onFinish: () => void;
  finished: boolean;
}

function targetLabel(exercise: Exercise): string {
  const sets = targetSets(exercise);
  const { targetRepsMin: min, targetRepsMax: max } = exercise;

  if (min && max) {
    return `${sets} × ${min}-${max}`;
  }

  if (max) {
    return `${sets} × ${max}`;
  }

  return `${sets} séries`;
}

export function SeriesPanel({
  exercise,
  series,
  reps,
  onRepsChange,
  onValidate,
  onRemoveLast,
  onFinish,
  finished,
}: SeriesPanelProps) {
  const goal = targetSets(exercise);
  const remaining = Math.max(0, goal - series.length);
  const rows = Math.max(goal, series.length + (finished ? 0 : 1));
  const repsCount = Number(reps);
  const canValidate = Number.isFinite(repsCount) && repsCount > 0;

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Séries</h3>
        <span className="text-xs text-ink-faint">Objectif {targetLabel(exercise)}</span>
      </div>

      <ol className="flex flex-col gap-1.5">
        {Array.from({ length: rows }, (_, index) => {
          const done = series[index];
          const active = !finished && index === series.length;
          const isLastDone = done !== undefined && index === series.length - 1;

          return (
            <motion.li
              key={index}
              layout
              className={`flex items-center gap-2 rounded-card border px-3 py-2 ${
                active
                  ? "border-accent/50 bg-accent-soft"
                  : done
                    ? "border-line bg-surface-raised"
                    : "border-dashed border-line"
              }`}
            >
              <span
                className={`tabular w-4 shrink-0 text-xs font-bold ${
                  done ? "text-accent" : "text-ink-faint"
                }`}
              >
                {index + 1}
              </span>

              {done ? (
                <>
                  <span className="tabular flex-1 text-sm font-semibold text-ink">
                    {formatWithUnit(done.value, exercise.unit)}
                    <span className="font-normal text-ink-muted"> × {done.reps}</span>
                  </span>
                  {isLastDone ? (
                    <button
                      type="button"
                      onClick={onRemoveLast}
                      aria-label={`Annuler la série ${index + 1}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  ) : (
                    <span aria-hidden="true" className="px-2 text-accent">
                      ✓
                    </span>
                  )}
                </>
              ) : active ? (
                <>
                  <label className="flex flex-1 items-center gap-2">
                    <span className="sr-only">Répétitions de la série {index + 1}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={reps}
                      onChange={(event) => onRepsChange(event.target.value.replace(/[^\d]/g, ""))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && canValidate) {
                          event.preventDefault();
                          onValidate();
                        }
                      }}
                      placeholder="reps"
                      className="tabular w-16 rounded-card border border-line bg-surface px-2 py-1.5 text-center text-base font-bold text-ink outline-none placeholder:text-xs placeholder:font-normal placeholder:text-ink-faint"
                    />
                    <span className="text-xs text-ink-muted">reps</span>
                  </label>

                  <button
                    type="button"
                    onClick={onValidate}
                    disabled={!canValidate}
                    className="shrink-0 rounded-pill bg-accent px-4 py-1.5 text-sm font-bold text-accent-ink transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Valider
                  </button>
                </>
              ) : (
                <span className="flex-1 text-sm text-ink-faint">à faire</span>
              )}
            </motion.li>
          );
        })}
      </ol>

      <AnimatePresence initial={false}>
        {series.length > 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-center text-xs text-ink-faint"
          >
            {finished
              ? `Séance terminée — ${formatValue(
                  series.reduce((total, set) => total + set.value * set.reps, 0),
                )} kg soulevés`
              : remaining > 0
                ? `Encore ${remaining} série${remaining > 1 ? "s" : ""}`
                : "Objectif atteint, tu peux terminer"}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {!finished && series.length > 0 ? (
        <button
          type="button"
          onClick={onFinish}
          className="mt-3 w-full rounded-card border border-accent/40 py-2.5 text-sm font-bold text-accent transition-colors hover:bg-accent-soft"
        >
          Terminer l&apos;exercice
        </button>
      ) : null}
    </section>
  );
}
