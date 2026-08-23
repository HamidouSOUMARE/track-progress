"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import { normalizeText } from "@/lib/search";
import type { Exercise } from "@/lib/types";

interface ExercisePickerSheetProps {
  open: boolean;
  dayLabel: string;
  exercises: Exercise[];
  selectedIds: string[];
  onToggle: (exerciseId: string) => void;
  onClose: () => void;
}

/** Ajout d'exercices à une séance : sélection multiple, effet immédiat. */
export function ExercisePickerSheet({
  open,
  dayLabel,
  exercises,
  selectedIds,
  onToggle,
  onClose,
}: ExercisePickerSheetProps) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);

  const sections = useMemo(() => {
    const needle = normalizeText(query.trim());
    const matching = exercises.filter(
      (exercise) => needle.length === 0 || normalizeText(exercise.name).includes(needle),
    );

    return MUSCLE_GROUPS.map((group) => ({
      group,
      items: matching.filter((exercise) => exercise.group === group.id),
    })).filter((section) => section.items.length > 0);
  }, [exercises, query]);

  return (
    <Sheet open={open} title={`Ajouter des exercices — ${dayLabel}`} onClose={onClose}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">Exercices du {dayLabel.toLowerCase()}</h2>
        <span className="tabular text-sm text-ink-muted">{selectedIds.length}</span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher…"
        aria-label="Rechercher un exercice"
        className="mt-4 w-full rounded-pill border border-line bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
      />

      <div className="mt-4 flex flex-col gap-4">
        {sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">Aucun exercice ne correspond.</p>
        ) : (
          sections.map((section) => (
            <section key={section.group.id}>
              <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold tracking-wide text-ink-muted uppercase">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-pill"
                  style={{ backgroundColor: `var(${section.group.accent})` }}
                />
                {section.group.label}
              </h3>

              <ul className="flex flex-col">
                {section.items.map((exercise) => {
                  const checked = selected.has(exercise.id);

                  return (
                    <li key={exercise.id}>
                      <button
                        type="button"
                        aria-pressed={checked}
                        onClick={() => onToggle(exercise.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-card px-2 py-2.5 text-left transition-colors hover:bg-surface-hover"
                      >
                        <span
                          className={`text-sm ${checked ? "font-semibold text-ink" : "text-ink-muted"}`}
                        >
                          {exercise.name}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex size-5 shrink-0 items-center justify-center rounded-pill border text-xs font-bold ${
                            checked
                              ? "border-accent bg-accent text-accent-ink"
                              : "border-line text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="sticky bottom-0 mt-5 w-full rounded-card bg-accent py-3 text-sm font-bold text-accent-ink"
      >
        Terminer
      </button>
    </Sheet>
  );
}
