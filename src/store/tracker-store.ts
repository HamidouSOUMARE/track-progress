"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { WEEKDAYS, emptyWeek, todayStamp } from "@/data/weekdays";
import { createId } from "@/lib/id";
import { mergeSnapshots } from "@/lib/merge";
import { sanitizeExercise, sanitizeSnapshot } from "@/lib/sanitize";
import { entryOn, entrySeries, isEntryDone, openEntryOn, targetSets } from "@/lib/session";
import { isRecord } from "@/lib/progress";
import type {
  Exercise,
  Goal,
  LogEntry,
  MuscleGroupId,
  Program,
  SetLog,
  TrackKind,
  Tracking,
  Unit,
  WeekdayId,
  Workout,
} from "@/lib/types";

const STORAGE_KEY = "track-progress";

/** Version du format persisté, reprise dans les fichiers exportés. */
export const STORAGE_VERSION = 6;

export interface NewExercise {
  name: string;
  group: MuscleGroupId;
  unit: Unit;
  kind: TrackKind;
  goal: Goal;
  /** Repos en secondes entre deux séries. */
  rest?: number;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
}

export interface LogInput {
  value: number;
  reps: number | null;
  sets: number | null;
}

export interface SetResult {
  /** Rang de la série qu'on vient de valider. */
  setNumber: number;
  /** Le nombre de séries visé est atteint. */
  reachedTarget: boolean;
}

export interface LogResult {
  record: boolean;
  /** Écart brut avec la dernière valeur, signe compris. */
  delta: number;
  /** Écart lu dans le sens de l'objectif : positif = ça progresse. */
  gain: number;
  previous: number;
}

/** Place d'un exercice dans une séance, retenue pour pouvoir l'y remettre. */
interface ProgramSlot {
  programId: string;
  workoutId: string;
  index: number;
}

/** Dernière suppression, gardée en mémoire le temps de proposer une annulation. */
export type Deletion =
  | { type: "entry"; exerciseId: string; entry: LogEntry; index: number }
  | {
      type: "exercise";
      exercise: Exercise;
      index: number;
      tracking: Tracking | undefined;
      slots: ProgramSlot[];
    }
  | { type: "program"; program: Program; index: number; wasActive: boolean }
  | { type: "archive"; exerciseId: string; previous: boolean }
  | {
      type: "workout";
      programId: string;
      workout: Workout;
      index: number;
      /** Jours où la séance était posée. */
      days: WeekdayId[];
    };

export interface SelectedDay {
  day: WeekdayId;
  /** Date de la sélection : au-delà, on repart sur le jour courant. */
  date: string;
}

export interface TrackerSnapshot {
  exercises: Exercise[];
  trackings: Record<string, Tracking>;
  programs: Program[];
  activeProgramId: string | null;
}

interface TrackerState extends TrackerSnapshot {
  lastDeletion: Deletion | null;
  selectedDay: SelectedDay | null;
  addExercise: (input: NewExercise) => Exercise;
  removeExercise: (exerciseId: string) => void;
  startTracking: (exerciseId: string, reference: number) => void;
  updateReference: (exerciseId: string, reference: number) => void;
  setGoal: (exerciseId: string, goal: Goal) => void;
  setNote: (exerciseId: string, note: string) => void;
  updateExercise: (exerciseId: string, patch: Partial<NewExercise>) => void;
  setArchived: (exerciseId: string, archived: boolean) => void;
  undoDelete: () => void;
  createProgram: (name: string) => Program;
  renameProgram: (programId: string, name: string) => void;
  deleteProgram: (programId: string) => void;
  setActiveProgram: (programId: string | null) => void;
  selectDay: (day: WeekdayId) => void;
  createWorkout: (programId: string, name: string) => Workout | null;
  renameWorkout: (programId: string, workoutId: string, name: string) => void;
  deleteWorkout: (programId: string, workoutId: string) => void;
  assignWorkout: (programId: string, day: WeekdayId, workoutId: string) => void;
  unassignWorkout: (programId: string, day: WeekdayId, workoutId: string) => void;
  toggleExerciseInWorkout: (programId: string, workoutId: string, exerciseId: string) => void;
  moveExerciseInWorkout: (
    programId: string,
    workoutId: string,
    exerciseId: string,
    offset: number,
  ) => void;
  reorderWorkout: (programId: string, workoutId: string, orderedIds: string[]) => void;
  logValue: (exerciseId: string, input: LogInput) => LogResult | null;
  logSet: (exerciseId: string, set: SetLog) => SetResult | null;
  removeLastSet: (exerciseId: string) => void;
  finishExercise: (exerciseId: string) => LogResult | null;
  removeEntry: (exerciseId: string, entryId: string) => void;
  replaceAll: (snapshot: TrackerSnapshot) => void;
  mergeAll: (snapshot: TrackerSnapshot) => void;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createEntry(input: LogInput): LogEntry {
  return {
    id: createId(),
    value: input.value,
    reps: input.reps,
    sets: input.sets,
    date: new Date().toISOString(),
  };
}

/**
 * v1 ne connaissait que les charges. On complète les exercices existants et on
 * ajoute les mensurations par défaut sans toucher à l'historique déjà saisi.
 */
function mapWorkout(
  programs: Program[],
  programId: string,
  workoutId: string,
  update: (workout: Workout) => Workout,
): Program[] {
  return programs.map((program) =>
    program.id === programId
      ? {
          ...program,
          workouts: program.workouts.map((workout) =>
            workout.id === workoutId ? update(workout) : workout,
          ),
        }
      : program,
  );
}

export function migrateSnapshot(persisted: unknown, version: number): TrackerSnapshot {
  const snapshot = (persisted ?? {}) as Partial<TrackerSnapshot>;
  const trackings = snapshot.trackings ?? {};
  // Les programmes n'existaient pas avant la v3.
  const programs = snapshot.programs ?? [];
  const activeProgramId = snapshot.activeProgramId ?? null;

  if (!Array.isArray(snapshot.exercises)) {
    return sanitizeSnapshot({
      exercises: buildDefaultExercises(),
      trackings,
      programs,
      activeProgramId,
    });
  }

  if (version >= 2) {
    // Les versions 2 et 3 ont pu enregistrer des groupes venus d'un import.
    return sanitizeSnapshot({
      exercises: snapshot.exercises,
      trackings,
      programs,
      activeProgramId,
    });
  }

  const upgraded = snapshot.exercises.map<Exercise>((exercise) => ({
    ...exercise,
    kind: exercise.kind ?? "charge",
    goal: exercise.goal ?? "up",
  }));
  const known = new Set(upgraded.map((exercise) => exercise.id));
  const added = buildDefaultExercises().filter(
    (exercise) => exercise.kind === "mesure" && !known.has(exercise.id),
  );

  return sanitizeSnapshot({
    exercises: [...upgraded, ...added],
    trackings,
    programs,
    activeProgramId,
  });
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      exercises: buildDefaultExercises(),
      trackings: {},
      programs: [],
      activeProgramId: null,
      lastDeletion: null,
      selectedDay: null,

      addExercise: (input) => {
        const base = slugify(input.name) || "exercice";
        const taken = new Set(get().exercises.map((exercise) => exercise.id));
        const id = taken.has(base) ? `${base}-${createId().slice(0, 4)}` : base;
        const exercise: Exercise = { ...input, id, custom: true };

        set((state) => ({ exercises: [...state.exercises, exercise] }));
        return exercise;
      },

      removeExercise: (exerciseId) => {
        set((state) => {
          const index = state.exercises.findIndex((exercise) => exercise.id === exerciseId);
          const exercise = state.exercises[index];
          if (!exercise) {
            return state;
          }

          const trackings = { ...state.trackings };
          const tracking = trackings[exerciseId];
          delete trackings[exerciseId];

          const slots: ProgramSlot[] = [];
          const programs = state.programs.map((program) => ({
            ...program,
            workouts: program.workouts.map((workout) => {
              const slot = workout.exercises.indexOf(exerciseId);
              if (slot < 0) {
                return workout;
              }

              slots.push({ programId: program.id, workoutId: workout.id, index: slot });
              return {
                ...workout,
                exercises: workout.exercises.filter((id) => id !== exerciseId),
              };
            }),
          }));

          return {
            exercises: state.exercises.filter((item) => item.id !== exerciseId),
            trackings,
            programs,
            lastDeletion: { type: "exercise", exercise, index, tracking, slots },
          };
        });
      },

      startTracking: (exerciseId, reference) => {
        set((state) => ({
          trackings: {
            ...state.trackings,
            [exerciseId]: {
              exerciseId,
              reference,
              referenceDate: new Date().toISOString(),
              entries: [],
            },
          },
        }));
      },

      updateReference: (exerciseId, reference) => {
        const tracking = get().trackings[exerciseId];
        if (!tracking) {
          get().startTracking(exerciseId, reference);
          return;
        }

        set((state) => ({
          trackings: {
            ...state.trackings,
            [exerciseId]: { ...tracking, reference, referenceDate: new Date().toISOString() },
          },
        }));
      },

      updateExercise: (exerciseId, patch) => {
        set((state) => ({
          exercises: state.exercises.map((exercise) =>
            exercise.id === exerciseId
              ? sanitizeExercise({ ...exercise, ...patch })
              : exercise,
          ),
        }));
      },

      setNote: (exerciseId, note) => {
        const trimmed = note.trim();
        set((state) => ({
          exercises: state.exercises.map((exercise) =>
            exercise.id === exerciseId
              ? { ...exercise, note: trimmed.length > 0 ? note : undefined }
              : exercise,
          ),
        }));
      },

      setArchived: (exerciseId, archived) => {
        const previous = get().exercises.find((exercise) => exercise.id === exerciseId)?.archived;

        set((state) => ({
          exercises: state.exercises.map((exercise) =>
            exercise.id === exerciseId ? { ...exercise, archived } : exercise,
          ),
          // Masquer se défait comme une suppression : même canal d'annulation.
          lastDeletion: { type: "archive", exerciseId, previous: previous === true },
        }));
      },

      setGoal: (exerciseId, goal) => {
        set((state) => ({
          exercises: state.exercises.map((exercise) =>
            exercise.id === exerciseId ? { ...exercise, goal } : exercise,
          ),
        }));
      },

      logValue: (exerciseId, input) => {
        const tracking = get().trackings[exerciseId];
        if (!tracking) {
          return null;
        }

        const goal = get().exercises.find((exercise) => exercise.id === exerciseId)?.goal ?? "up";
        const previous = tracking.entries.at(-1)?.value ?? tracking.reference;
        const record = isRecord(tracking, input.value, goal);
        const delta = input.value - previous;

        set((state) => ({
          trackings: {
            ...state.trackings,
            [exerciseId]: { ...tracking, entries: [...tracking.entries, createEntry(input)] },
          },
        }));

        return { record, delta, gain: goal === "up" ? delta : -delta, previous };
      },

      /**
       * Ajoute une série à la séance du jour, en ouvrant l'entrée à la première.
       * L'écriture est immédiate : fermer l'app entre deux séries ne perd rien.
       */
      logSet: (exerciseId, newSet) => {
        const state = get();
        const tracking = state.trackings[exerciseId];
        const exercise = state.exercises.find((item) => item.id === exerciseId);

        if (!tracking || !exercise) {
          return null;
        }

        // On complète la séance du jour même terminée : rien n'interdit une
        // série de plus après coup.
        const open = entryOn(tracking, new Date());
        const series = open ? [...entrySeries(open), newSet] : [newSet];
        const entry: LogEntry = open
          ? { ...open, series, value: Math.max(open.value, newSet.value), done: open.done }
          : {
              id: createId(),
              value: newSet.value,
              reps: null,
              sets: null,
              series,
              done: false,
              date: new Date().toISOString(),
            };

        set((current) => {
          const target = current.trackings[exerciseId];
          if (!target) {
            return current;
          }

          const entries = open
            ? target.entries.map((item) => (item.id === entry.id ? entry : item))
            : [...target.entries, entry];

          return { trackings: { ...current.trackings, [exerciseId]: { ...target, entries } } };
        });

        return {
          setNumber: series.length,
          reachedTarget:
            !isEntryDone(entry) && series.length >= targetSets(exercise),
        };
      },

      /** Retire la dernière série validée : une répétition mal tapée se rattrape. */
      removeLastSet: (exerciseId) => {
        set((state) => {
          const tracking = state.trackings[exerciseId];
          const today = tracking ? entryOn(tracking, new Date()) : null;

          if (!tracking || !today) {
            return state;
          }

          const series = entrySeries(today).slice(0, -1);
          const entries =
            series.length === 0
              ? tracking.entries.filter((entry) => entry.id !== today.id)
              : tracking.entries.map((entry) =>
                  entry.id === today.id
                    ? {
                        ...entry,
                        series,
                        value: Math.max(...series.map((item) => item.value)),
                        done: false,
                      }
                    : entry,
                );

          return { trackings: { ...state.trackings, [exerciseId]: { ...tracking, entries } } };
        });
      },

      /**
       * Clôt la séance du jour pour cet exercice. Le record se juge sur la
       * charge la plus lourde, comparée à tout l'historique sauf cette séance.
       */
      finishExercise: (exerciseId) => {
        const state = get();
        const tracking = state.trackings[exerciseId];
        const goal = state.exercises.find((item) => item.id === exerciseId)?.goal ?? "up";
        const open = tracking ? openEntryOn(tracking, new Date()) : null;

        if (!tracking || !open) {
          return null;
        }

        const others = tracking.entries.filter((entry) => entry.id !== open.id);
        const previousBest = others.reduce(
          (best, entry) => (goal === "up" ? Math.max(best, entry.value) : Math.min(best, entry.value)),
          tracking.reference,
        );
        const previous = [...others].reverse().find(isEntryDone)?.value ?? tracking.reference;
        const delta = open.value - previous;

        set((current) => {
          const target = current.trackings[exerciseId];
          if (!target) {
            return current;
          }

          return {
            trackings: {
              ...current.trackings,
              [exerciseId]: {
                ...target,
                entries: target.entries.map((entry) =>
                  entry.id === open.id ? { ...entry, done: true } : entry,
                ),
              },
            },
          };
        });

        return {
          record: goal === "up" ? open.value > previousBest : open.value < previousBest,
          delta,
          gain: goal === "up" ? delta : -delta,
          previous,
        };
      },

      removeEntry: (exerciseId, entryId) => {
        const tracking = get().trackings[exerciseId];
        const index = tracking?.entries.findIndex((entry) => entry.id === entryId) ?? -1;
        const removed = tracking?.entries[index];

        if (!tracking || !removed) {
          return;
        }

        set((state) => ({
          trackings: {
            ...state.trackings,
            [exerciseId]: {
              ...tracking,
              entries: tracking.entries.filter((entry) => entry.id !== entryId),
            },
          },
          lastDeletion: { type: "entry", exerciseId, entry: removed, index },
        }));
      },

      createProgram: (name) => {
        const program: Program = { id: createId(), name, workouts: [], days: emptyWeek() };

        set((state) => ({
          programs: [...state.programs, program],
          // Le premier programme créé devient forcément celui qu'on suit.
          activeProgramId: state.activeProgramId ?? program.id,
        }));

        return program;
      },

      renameProgram: (programId, name) => {
        set((state) => ({
          programs: state.programs.map((program) =>
            program.id === programId ? { ...program, name } : program,
          ),
        }));
      },

      deleteProgram: (programId) => {
        set((state) => {
          const index = state.programs.findIndex((program) => program.id === programId);
          const program = state.programs[index];
          if (!program) {
            return state;
          }

          const programs = state.programs.filter((item) => item.id !== programId);
          const wasActive = state.activeProgramId === programId;

          return {
            programs,
            activeProgramId: wasActive ? (programs[0]?.id ?? null) : state.activeProgramId,
            lastDeletion: { type: "program", program, index, wasActive },
          };
        });
      },

      setActiveProgram: (programId) => {
        set({ activeProgramId: programId });
      },

      selectDay: (day) => {
        set({ selectedDay: { day, date: todayStamp() } });
      },

      createWorkout: (programId, name) => {
        const program = get().programs.find((item) => item.id === programId);
        if (!program) {
          return null;
        }

        const workout: Workout = { id: createId(), name, exercises: [] };

        set((state) => ({
          programs: state.programs.map((item) =>
            item.id === programId ? { ...item, workouts: [...item.workouts, workout] } : item,
          ),
        }));

        return workout;
      },

      renameWorkout: (programId, workoutId, name) => {
        set((state) => ({
          programs: mapWorkout(state.programs, programId, workoutId, (workout) => ({
            ...workout,
            name,
          })),
        }));
      },

      /** Supprimer une séance la retire aussi des jours où elle était posée. */
      deleteWorkout: (programId, workoutId) => {
        set((state) => {
          const program = state.programs.find((item) => item.id === programId);
          const index = program?.workouts.findIndex((item) => item.id === workoutId) ?? -1;
          const workout = program?.workouts[index];

          if (!program || !workout) {
            return state;
          }

          const assignedTo = WEEKDAYS.filter((weekday) =>
            program.days[weekday.id].includes(workoutId),
          ).map((weekday) => weekday.id);

          const days = { ...program.days };
          for (const day of assignedTo) {
            days[day] = days[day].filter((id) => id !== workoutId);
          }

          return {
            programs: state.programs.map((item) =>
              item.id === programId
                ? { ...item, workouts: item.workouts.filter((w) => w.id !== workoutId), days }
                : item,
            ),
            lastDeletion: { type: "workout", programId, workout, index, days: assignedTo },
          };
        });
      },

      assignWorkout: (programId, day, workoutId) => {
        set((state) => ({
          programs: state.programs.map((program) => {
            if (program.id !== programId || program.days[day].includes(workoutId)) {
              return program;
            }

            return { ...program, days: { ...program.days, [day]: [...program.days[day], workoutId] } };
          }),
        }));
      },

      unassignWorkout: (programId, day, workoutId) => {
        set((state) => ({
          programs: state.programs.map((program) =>
            program.id === programId
              ? {
                  ...program,
                  days: { ...program.days, [day]: program.days[day].filter((id) => id !== workoutId) },
                }
              : program,
          ),
        }));
      },

      toggleExerciseInWorkout: (programId, workoutId, exerciseId) => {
        set((state) => ({
          programs: mapWorkout(state.programs, programId, workoutId, (workout) => ({
            ...workout,
            exercises: workout.exercises.includes(exerciseId)
              ? workout.exercises.filter((id) => id !== exerciseId)
              : [...workout.exercises, exerciseId],
          })),
        }));
      },

      moveExerciseInWorkout: (programId, workoutId, exerciseId, offset) => {
        set((state) => ({
          programs: mapWorkout(state.programs, programId, workoutId, (workout) => {
            const exercises = [...workout.exercises];
            const from = exercises.indexOf(exerciseId);
            const to = from + offset;

            if (from < 0 || to < 0 || to >= exercises.length) {
              return workout;
            }

            exercises.splice(to, 0, ...exercises.splice(from, 1));
            return { ...workout, exercises };
          }),
        }));
      },

      /**
       * Réordonne d'un coup, après un glisser-déposer. Les identifiants absents
       * de la nouvelle liste — un exercice qu'un fichier importé n'a pas fourni,
       * donc non affiché — sont conservés à la suite plutôt que perdus.
       */
      reorderWorkout: (programId, workoutId, orderedIds) => {
        set((state) => ({
          programs: mapWorkout(state.programs, programId, workoutId, (workout) => {
            const moved = new Set(orderedIds);
            const untouched = workout.exercises.filter((id) => !moved.has(id));

            return { ...workout, exercises: [...orderedIds, ...untouched] };
          }),
        }));
      },

      /** Remet la dernière suppression à sa place exacte, historique compris. */
      undoDelete: () => {
        const deletion = get().lastDeletion;
        if (!deletion) {
          return;
        }

        set((state) => {
          if (deletion.type === "workout") {
            return {
              programs: state.programs.map((program) => {
                if (program.id !== deletion.programId) {
                  return program;
                }

                const workouts = [...program.workouts];
                workouts.splice(deletion.index, 0, deletion.workout);

                const days = { ...program.days };
                for (const day of deletion.days) {
                  days[day] = [...days[day], deletion.workout.id];
                }

                return { ...program, workouts, days };
              }),
              lastDeletion: null,
            };
          }

          if (deletion.type === "archive") {
            return {
              exercises: state.exercises.map((exercise) =>
                exercise.id === deletion.exerciseId
                  ? { ...exercise, archived: deletion.previous }
                  : exercise,
              ),
              lastDeletion: null,
            };
          }

          if (deletion.type === "program") {
            const programs = [...state.programs];
            programs.splice(deletion.index, 0, deletion.program);

            return {
              programs,
              activeProgramId: deletion.wasActive ? deletion.program.id : state.activeProgramId,
              lastDeletion: null,
            };
          }

          if (deletion.type === "exercise") {
            const exercises = [...state.exercises];
            exercises.splice(deletion.index, 0, deletion.exercise);

            const programs = state.programs.map((program) => {
              const slots = deletion.slots.filter((slot) => slot.programId === program.id);
              if (slots.length === 0) {
                return program;
              }

              return {
                ...program,
                workouts: program.workouts.map((workout) => {
                  const slot = slots.find((item) => item.workoutId === workout.id);
                  if (!slot) {
                    return workout;
                  }

                  const exercises = [...workout.exercises];
                  exercises.splice(slot.index, 0, deletion.exercise.id);
                  return { ...workout, exercises };
                }),
              };
            });

            return {
              exercises,
              programs,
              trackings: deletion.tracking
                ? { ...state.trackings, [deletion.exercise.id]: deletion.tracking }
                : state.trackings,
              lastDeletion: null,
            };
          }

          const tracking = state.trackings[deletion.exerciseId];
          if (!tracking) {
            return { lastDeletion: null };
          }

          const entries = [...tracking.entries];
          entries.splice(deletion.index, 0, deletion.entry);

          return {
            trackings: { ...state.trackings, [deletion.exerciseId]: { ...tracking, entries } },
            lastDeletion: null,
          };
        });
      },

      replaceAll: (snapshot) => {
        set({ ...snapshot, lastDeletion: null });
      },

      mergeAll: (snapshot) => {
        set((state) =>
          mergeSnapshots(
            {
              exercises: state.exercises,
              trackings: state.trackings,
              programs: state.programs,
              activeProgramId: state.activeProgramId,
            },
            snapshot,
          ),
        );
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ exercises, trackings, programs, activeProgramId, selectedDay }) => ({
        exercises,
        trackings,
        programs,
        activeProgramId,
        selectedDay,
      }),
      // Le jour consulté ne fait pas partie de la sauvegarde échangeable :
      // on le reprend à part pour ne pas le perdre à la réhydratation.
      migrate: (persisted, version) => ({
        ...migrateSnapshot(persisted, version),
        selectedDay: (persisted as { selectedDay?: SelectedDay } | null)?.selectedDay ?? null,
      }),
    },
  ),
);

/**
 * Les données vivent dans localStorage : le premier rendu serveur ne les connaît
 * pas. Ce hook permet d'afficher un état de chargement plutôt qu'un faux vide.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useTrackerStore.persist.onFinishHydration(onStoreChange),
    () => useTrackerStore.persist.hasHydrated(),
    () => false,
  );
}
