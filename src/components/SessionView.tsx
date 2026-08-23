"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { WeekStrip } from "@/components/WeekStrip";
import { WEEKDAYS, resolveSelectedDay, todayWeekday } from "@/data/weekdays";
import { useTrackerStore } from "@/store/tracker-store";
import type { Exercise, WeekdayId } from "@/lib/types";

interface SessionViewProps {
  onOpenExercise: (exerciseId: string) => void;
  onManagePrograms: () => void;
}

export function SessionView({ onOpenExercise, onManagePrograms }: SessionViewProps) {
  const exercises = useTrackerStore((state) => state.exercises);
  const trackings = useTrackerStore((state) => state.trackings);
  const programs = useTrackerStore((state) => state.programs);
  const activeProgramId = useTrackerStore((state) => state.activeProgramId);
  const toggleExerciseInDay = useTrackerStore((state) => state.toggleExerciseInDay);
  const moveExerciseInDay = useTrackerStore((state) => state.moveExerciseInDay);
  const selectedDay = useTrackerStore((state) => state.selectedDay);
  const selectDay = useTrackerStore((state) => state.selectDay);

  const [today] = useState<WeekdayId>(() => todayWeekday());
  // Le jour consulté est persisté : un rafraîchissement ne renvoie pas ailleurs.
  const day = resolveSelectedDay(selectedDay);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);

  const program = programs.find((item) => item.id === activeProgramId) ?? programs[0] ?? null;
  const weekday = WEEKDAYS.find((item) => item.id === day)!;

  if (!program) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-16 text-center">
        <h2 className="text-lg font-bold text-ink">Aucun programme</h2>
        <p className="max-w-sm text-sm text-ink-muted">
          Crée un programme, place tes exercices sur les jours de la semaine, et retrouve
          ta séance du jour dès l&apos;ouverture de l&apos;app.
        </p>
        <button
          type="button"
          onClick={onManagePrograms}
          className="rounded-pill bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
        >
          Créer un programme
        </button>
      </section>
    );
  }

  const plannedIds = program.days[day];
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const planned = plannedIds
    .map((id) => byId.get(id))
    .filter((exercise): exercise is Exercise => exercise !== undefined);
  const visible = planned.filter((exercise) => !exercise.archived);
  const hidden = planned.length - visible.length;

  const counts = WEEKDAYS.reduce(
    (acc, item) => ({ ...acc, [item.id]: program.days[item.id].length }),
    {} as Record<WeekdayId, number>,
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onManagePrograms}
        className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover"
      >
        <span className="flex flex-col">
          <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            Programme suivi
          </span>
          <span className="text-sm font-bold text-ink">{program.name}</span>
        </span>
        <span aria-hidden="true" className="text-ink-faint">
          ›
        </span>
      </button>

      <WeekStrip value={day} today={today} counts={counts} onChange={selectDay} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-lg font-bold text-ink">
          {weekday.label}
          {day === today ? (
            <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
              Aujourd&apos;hui
            </span>
          ) : null}
        </h2>

        {planned.length > 0 ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="text-xs font-semibold text-ink-muted underline-offset-4 hover:text-accent hover:underline"
          >
            {editing ? "Terminer" : "Modifier la séance"}
          </button>
        ) : null}
      </div>

      {planned.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line py-14 text-center">
          <p className="text-sm text-ink-muted">Jour de repos.</p>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-pill bg-accent px-4 py-2 text-xs font-bold text-accent-ink"
          >
            Ajouter des exercices
          </button>
        </div>
      ) : editing ? (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {planned.map((exercise, index) => (
              <motion.li
                key={exercise.id}
                layout
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2.5"
              >
                <span className="tabular w-5 shrink-0 text-xs font-bold text-ink-faint">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {exercise.name}
                  {exercise.archived ? (
                    <span className="ml-2 text-xs font-normal text-ink-faint">masqué</span>
                  ) : null}
                </span>

                <button
                  type="button"
                  onClick={() => moveExerciseInDay(program.id, day, exercise.id, -1)}
                  disabled={index === 0}
                  aria-label={`Monter ${exercise.name}`}
                  className="flex size-8 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30"
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  type="button"
                  onClick={() => moveExerciseInDay(program.id, day, exercise.id, 1)}
                  disabled={index === planned.length - 1}
                  aria-label={`Descendre ${exercise.name}`}
                  className="flex size-8 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30"
                >
                  <span aria-hidden="true">↓</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleExerciseInDay(program.id, day, exercise.id)}
                  aria-label={`Retirer ${exercise.name} du ${weekday.label.toLowerCase()}`}
                  className="flex size-8 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-card border border-dashed border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            + Ajouter des exercices
          </button>
        </ul>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                tracking={trackings[exercise.id]}
                onOpen={onOpenExercise}
              />
            ))}
          </div>

          {hidden > 0 ? (
            <p className="text-xs text-ink-faint">
              {hidden} exercice{hidden > 1 ? "s" : ""} de cette séance {hidden > 1 ? "sont" : "est"}{" "}
              masqué{hidden > 1 ? "s" : ""}.
            </p>
          ) : null}
        </>
      )}

      <ExercisePickerSheet
        open={picking}
        dayLabel={weekday.label}
        exercises={exercises.filter((exercise) => !exercise.archived)}
        selectedIds={plannedIds}
        onToggle={(exerciseId) => toggleExerciseInDay(program.id, day, exerciseId)}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}
