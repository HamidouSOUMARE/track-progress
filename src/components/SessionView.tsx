"use client";

import { useState } from "react";
import { Reorder, motion } from "motion/react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { PlannedExerciseRow } from "@/components/PlannedExerciseRow";
import { WeekStrip } from "@/components/WeekStrip";
import { WEEKDAYS, resolveSelectedDay, todayWeekday } from "@/data/weekdays";
import { countDone, isDoneOn } from "@/lib/session";
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
  const reorderDay = useTrackerStore((state) => state.reorderDay);
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

  // L'avancement n'a de sens que pour la journée en cours.
  const now = new Date();
  const isToday = day === today;
  const doneCount = isToday ? countDone(visible, trackings, now) : 0;
  const remaining = isToday
    ? visible.filter((exercise) => !isDoneOn(trackings[exercise.id], now))
    : [];

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
        <div className="flex flex-col gap-2">
          <Reorder.Group
            axis="y"
            values={planned}
            onReorder={(next) =>
              reorderDay(
                program.id,
                day,
                next.map((exercise) => exercise.id),
              )
            }
            className="flex flex-col gap-2"
          >
            {planned.map((exercise, index) => (
              <PlannedExerciseRow
                key={exercise.id}
                exercise={exercise}
                position={index + 1}
                total={planned.length}
                dayLabel={weekday.label}
                onMove={(offset) => moveExerciseInDay(program.id, day, exercise.id, offset)}
                onRemove={() => toggleExerciseInDay(program.id, day, exercise.id)}
              />
            ))}
          </Reorder.Group>

          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-card border border-dashed border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            + Ajouter des exercices
          </button>

          <p className="text-center text-xs text-ink-faint">
            Glisse par la poignée pour changer l&apos;ordre de la séance.
          </p>
        </div>
      ) : (
        <>
          {isToday && visible.length > 0 ? (
            <section
              aria-label="Avancement de la séance"
              className="flex flex-col gap-2 rounded-card border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink">
                  {doneCount === visible.length ? "Séance terminée" : "Avancement"}
                </span>
                <span className="tabular text-sm font-bold text-ink-muted">
                  {doneCount}/{visible.length}
                </span>
              </div>

              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-pill bg-line">
                <motion.div
                  className="h-full rounded-pill bg-accent"
                  initial={false}
                  animate={{ width: `${(doneCount / visible.length) * 100}%` }}
                  transition={{ type: "spring", stiffness: 260, damping: 32 }}
                />
              </div>

              <p className="text-xs text-ink-faint">
                {remaining.length === 0
                  ? "Tout est enregistré, bravo."
                  : `Reste : ${remaining.map((exercise) => exercise.name).join(", ")}`}
              </p>
            </section>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                tracking={trackings[exercise.id]}
                done={isToday && isDoneOn(trackings[exercise.id], now)}
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
