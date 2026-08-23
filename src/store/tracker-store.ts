"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { emptyWeek, todayStamp } from "@/data/weekdays";
import { mergeSnapshots } from "@/lib/merge";
import { sanitizeSnapshot } from "@/lib/sanitize";
import { isRecord } from "@/lib/progress";
import type {
  Exercise,
  Goal,
  LogEntry,
  MuscleGroupId,
  Program,
  TrackKind,
  Tracking,
  Unit,
  WeekdayId,
} from "@/lib/types";

const STORAGE_KEY = "track-progress";

/** Version du format persisté, reprise dans les fichiers exportés. */
export const STORAGE_VERSION = 4;

export interface NewExercise {
  name: string;
  group: MuscleGroupId;
  unit: Unit;
  kind: TrackKind;
  goal: Goal;
}

export interface LogInput {
  value: number;
  reps: number | null;
  sets: number | null;
}

export interface LogResult {
  record: boolean;
  /** Écart brut avec la dernière valeur, signe compris. */
  delta: number;
  /** Écart lu dans le sens de l'objectif : positif = ça progresse. */
  gain: number;
  previous: number;
}

/** Place d'un exercice dans un programme, retenue pour pouvoir l'y remettre. */
interface ProgramSlot {
  programId: string;
  day: WeekdayId;
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
  | { type: "archive"; exerciseId: string; previous: boolean };

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
  setArchived: (exerciseId: string, archived: boolean) => void;
  undoDelete: () => void;
  createProgram: (name: string) => Program;
  renameProgram: (programId: string, name: string) => void;
  deleteProgram: (programId: string) => void;
  setActiveProgram: (programId: string | null) => void;
  selectDay: (day: WeekdayId) => void;
  toggleExerciseInDay: (programId: string, day: WeekdayId, exerciseId: string) => void;
  moveExerciseInDay: (
    programId: string,
    day: WeekdayId,
    exerciseId: string,
    offset: number,
  ) => void;
  logValue: (exerciseId: string, input: LogInput) => LogResult | null;
  removeEntry: (exerciseId: string, entryId: string) => void;
  replaceAll: (snapshot: TrackerSnapshot) => void;
  mergeAll: (snapshot: TrackerSnapshot) => void;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
          const programs = state.programs.map((program) => {
            const days = { ...program.days };

            for (const [day, ids] of Object.entries(days) as [WeekdayId, string[]][]) {
              const slot = ids.indexOf(exerciseId);
              if (slot >= 0) {
                slots.push({ programId: program.id, day, index: slot });
                days[day] = ids.filter((id) => id !== exerciseId);
              }
            }

            return { ...program, days };
          });

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
        const program: Program = { id: createId(), name, days: emptyWeek() };

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

      toggleExerciseInDay: (programId, day, exerciseId) => {
        set((state) => ({
          programs: state.programs.map((program) => {
            if (program.id !== programId) {
              return program;
            }

            const ids = program.days[day];
            const next = ids.includes(exerciseId)
              ? ids.filter((id) => id !== exerciseId)
              : [...ids, exerciseId];

            return { ...program, days: { ...program.days, [day]: next } };
          }),
        }));
      },

      moveExerciseInDay: (programId, day, exerciseId, offset) => {
        set((state) => ({
          programs: state.programs.map((program) => {
            if (program.id !== programId) {
              return program;
            }

            const ids = [...program.days[day]];
            const from = ids.indexOf(exerciseId);
            const to = from + offset;

            if (from < 0 || to < 0 || to >= ids.length) {
              return program;
            }

            ids.splice(to, 0, ...ids.splice(from, 1));
            return { ...program, days: { ...program.days, [day]: ids } };
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

              const days = { ...program.days };
              for (const slot of slots) {
                const ids = [...days[slot.day]];
                ids.splice(slot.index, 0, deletion.exercise.id);
                days[slot.day] = ids;
              }

              return { ...program, days };
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
