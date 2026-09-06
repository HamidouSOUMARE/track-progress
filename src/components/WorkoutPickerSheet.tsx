"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { WEEKDAYS } from "@/data/weekdays";
import type { Program, WeekdayId } from "@/lib/types";

interface WorkoutPickerSheetProps {
  open: boolean;
  program: Program;
  day: WeekdayId;
  dayLabel: string;
  onAssign: (workoutId: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

/** Jours où la séance est déjà posée, pour montrer ce qui est mutualisé. */
function assignedDays(program: Program, workoutId: string): string[] {
  return WEEKDAYS.filter((weekday) => program.days[weekday.id].includes(workoutId)).map(
    (weekday) => weekday.label.toLowerCase(),
  );
}

export function WorkoutPickerSheet({
  open,
  program,
  day,
  dayLabel,
  onAssign,
  onCreate,
  onClose,
}: WorkoutPickerSheetProps) {
  const [draft, setDraft] = useState("");
  const alreadyHere = new Set(program.days[day]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) {
      return;
    }

    onCreate(name);
    setDraft("");
  };

  return (
    <Sheet open={open} title={`Séance du ${dayLabel.toLowerCase()}`} onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Ajouter une séance</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Au {dayLabel.toLowerCase()}. Une même séance peut revenir plusieurs fois dans la
            semaine.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Fermer
        </button>
      </div>

      {program.workouts.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2">
          {program.workouts.map((workout) => {
            const here = alreadyHere.has(workout.id);
            const days = assignedDays(program, workout.id);

            return (
              <li key={workout.id}>
                <button
                  type="button"
                  disabled={here}
                  onClick={() => onAssign(workout.id)}
                  className="flex w-full flex-col gap-0.5 rounded-card border border-line bg-surface-raised px-4 py-3 text-left transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-ink">{workout.name}</span>
                  <span className="text-xs text-ink-faint">
                    {workout.exercises.length} exercice
                    {workout.exercises.length > 1 ? "s" : ""}
                    {days.length > 0 ? ` · ${days.join(", ")}` : " · jamais programmée"}
                    {here ? " · déjà ici" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
          Aucune séance dans ce programme. Donne un nom à la première.
        </p>
      )}

      <form onSubmit={submit} className="mt-5 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex. Haut du corps"
          aria-label="Nom de la nouvelle séance"
          className="min-w-0 flex-1 rounded-card border border-line bg-surface-raised px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="shrink-0 rounded-card bg-accent px-4 text-sm font-bold text-accent-ink disabled:opacity-40"
        >
          Créer
        </button>
      </form>
    </Sheet>
  );
}
