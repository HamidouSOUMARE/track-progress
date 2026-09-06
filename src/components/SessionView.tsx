"use client";

import { useState } from "react";
import { Reorder, motion } from "motion/react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExercisePickerSheet } from "@/components/ExercisePickerSheet";
import { PlannedExerciseRow } from "@/components/PlannedExerciseRow";
import { WeekStrip } from "@/components/WeekStrip";
import { WorkoutPickerSheet } from "@/components/WorkoutPickerSheet";
import { WEEKDAYS, resolveSelectedDay, todayWeekday } from "@/data/weekdays";
import { countDone, isDoneOn, setsDoneOn } from "@/lib/session";
import { useTrackerStore } from "@/store/tracker-store";
import type { Exercise, Program, WeekdayId, Workout } from "@/lib/types";

interface SessionViewProps {
  onOpenExercise: (exerciseId: string) => void;
  onManagePrograms: () => void;
}

/** Autres jours où la séance revient, pour prévenir avant de la modifier. */
function otherDays(program: Program, workoutId: string, day: WeekdayId): string[] {
  return WEEKDAYS.filter(
    (weekday) => weekday.id !== day && program.days[weekday.id].includes(workoutId),
  ).map((weekday) => weekday.label.toLowerCase());
}

export function SessionView({ onOpenExercise, onManagePrograms }: SessionViewProps) {
  const exercises = useTrackerStore((state) => state.exercises);
  const trackings = useTrackerStore((state) => state.trackings);
  const programs = useTrackerStore((state) => state.programs);
  const activeProgramId = useTrackerStore((state) => state.activeProgramId);
  const selectedDay = useTrackerStore((state) => state.selectedDay);
  const selectDay = useTrackerStore((state) => state.selectDay);
  const createWorkout = useTrackerStore((state) => state.createWorkout);
  const renameWorkout = useTrackerStore((state) => state.renameWorkout);
  const assignWorkout = useTrackerStore((state) => state.assignWorkout);
  const unassignWorkout = useTrackerStore((state) => state.unassignWorkout);
  const toggleExerciseInWorkout = useTrackerStore((state) => state.toggleExerciseInWorkout);
  const moveExerciseInWorkout = useTrackerStore((state) => state.moveExerciseInWorkout);
  const reorderWorkout = useTrackerStore((state) => state.reorderWorkout);

  const [today] = useState<WeekdayId>(() => todayWeekday());
  // Le jour consulté est persisté : un rafraîchissement ne renvoie pas ailleurs.
  const day = resolveSelectedDay(selectedDay);
  const [editing, setEditing] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [addingWorkout, setAddingWorkout] = useState(false);

  const program = programs.find((item) => item.id === activeProgramId) ?? programs[0] ?? null;
  const weekday = WEEKDAYS.find((item) => item.id === day)!;

  if (!program) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-16 text-center">
        <h2 className="text-lg font-bold text-ink">Aucun programme</h2>
        <p className="max-w-sm text-sm text-ink-muted">
          Un programme réunit tes séances — Haut du corps, Jambes… — puis tu les poses sur
          les jours de la semaine. Changer de rythme ne demande alors que de les déplacer.
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

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const dayWorkouts = program.days[day]
    .map((id) => program.workouts.find((workout) => workout.id === id))
    .filter((workout): workout is Workout => workout !== undefined);

  const resolve = (workout: Workout): Exercise[] =>
    workout.exercises
      .map((id) => byId.get(id))
      .filter((exercise): exercise is Exercise => exercise !== undefined);

  const planned = dayWorkouts.flatMap(resolve);
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
    (acc, item) => ({
      ...acc,
      [item.id]: program.days[item.id].reduce(
        (total, workoutId) =>
          total + (program.workouts.find((w) => w.id === workoutId)?.exercises.length ?? 0),
        0,
      ),
    }),
    {} as Record<WeekdayId, number>,
  );

  const pickingWorkout = program.workouts.find((workout) => workout.id === pickingFor) ?? null;

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

        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="text-xs font-semibold text-ink-muted underline-offset-4 hover:text-accent hover:underline"
        >
          {editing ? "Terminer l'édition" : "Modifier la journée"}
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          {dayWorkouts.map((workout) => {
            const shared = otherDays(program, workout.id, day);
            const items = resolve(workout);

            return (
              <section
                key={workout.id}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={workout.name}
                    onChange={(event) => renameWorkout(program.id, workout.id, event.target.value)}
                    aria-label={`Nom de la séance ${workout.name}`}
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => unassignWorkout(program.id, day, workout.id)}
                    aria-label={`Retirer ${workout.name} du ${weekday.label.toLowerCase()}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>

                {shared.length > 0 ? (
                  <p className="text-xs text-ink-faint">
                    Aussi programmée le {shared.join(", ")} — les modifications s&apos;y
                    appliquent.
                  </p>
                ) : null}

                <Reorder.Group
                  axis="y"
                  values={items}
                  onReorder={(next) =>
                    reorderWorkout(
                      program.id,
                      workout.id,
                      next.map((exercise) => exercise.id),
                    )
                  }
                  className="flex flex-col gap-2"
                >
                  {items.map((exercise, index) => (
                    <PlannedExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      position={index + 1}
                      total={items.length}
                      dayLabel={workout.name}
                      onMove={(offset) =>
                        moveExerciseInWorkout(program.id, workout.id, exercise.id, offset)
                      }
                      onRemove={() =>
                        toggleExerciseInWorkout(program.id, workout.id, exercise.id)
                      }
                    />
                  ))}
                </Reorder.Group>

                <button
                  type="button"
                  onClick={() => setPickingFor(workout.id)}
                  className="rounded-card border border-dashed border-line py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
                >
                  + Ajouter des exercices
                </button>
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => setAddingWorkout(true)}
            className="rounded-card border border-dashed border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            + Ajouter une séance à ce jour
          </button>
        </div>
      ) : dayWorkouts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line py-14 text-center">
          <p className="text-sm text-ink-muted">Jour de repos.</p>
          <button
            type="button"
            onClick={() => setAddingWorkout(true)}
            className="rounded-pill bg-accent px-4 py-2 text-xs font-bold text-accent-ink"
          >
            Programmer une séance
          </button>
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

          {dayWorkouts.map((workout) => {
            const items = resolve(workout).filter((exercise) => !exercise.archived);

            return (
              <section key={workout.id} className="flex flex-col gap-3">
                <h3 className="flex items-baseline gap-2 text-sm font-bold tracking-wide text-ink-muted uppercase">
                  {workout.name}
                  <span className="tabular text-xs font-medium text-ink-faint">
                    {items.length}
                  </span>
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      tracking={trackings[exercise.id]}
                      done={isToday && isDoneOn(trackings[exercise.id], now)}
                      setsDone={isToday ? setsDoneOn(trackings[exercise.id], now) : 0}
                      onOpen={onOpenExercise}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {hidden > 0 ? (
            <p className="text-xs text-ink-faint">
              {hidden} exercice{hidden > 1 ? "s" : ""} de cette journée{" "}
              {hidden > 1 ? "sont" : "est"} masqué{hidden > 1 ? "s" : ""}.
            </p>
          ) : null}
        </>
      )}

      <ExercisePickerSheet
        open={pickingWorkout !== null}
        dayLabel={pickingWorkout?.name ?? weekday.label}
        exercises={exercises.filter((exercise) => !exercise.archived)}
        selectedIds={pickingWorkout?.exercises ?? []}
        onToggle={(exerciseId) =>
          pickingWorkout && toggleExerciseInWorkout(program.id, pickingWorkout.id, exerciseId)
        }
        onClose={() => setPickingFor(null)}
      />

      <WorkoutPickerSheet
        open={addingWorkout}
        program={program}
        day={day}
        dayLabel={weekday.label}
        onAssign={(workoutId) => {
          assignWorkout(program.id, day, workoutId);
          setAddingWorkout(false);
          setEditing(true);
        }}
        onCreate={(name) => {
          const workout = createWorkout(program.id, name);
          if (workout) {
            assignWorkout(program.id, day, workout.id);
            setAddingWorkout(false);
            setEditing(true);
            setPickingFor(workout.id);
          }
        }}
        onClose={() => setAddingWorkout(false)}
      />
    </div>
  );
}
