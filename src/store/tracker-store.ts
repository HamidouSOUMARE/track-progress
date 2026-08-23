"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { mergeSnapshots } from "@/lib/merge";
import { isRecord } from "@/lib/progress";
import type {
  Exercise,
  Goal,
  LogEntry,
  MuscleGroupId,
  TrackKind,
  Tracking,
  Unit,
} from "@/lib/types";

const STORAGE_KEY = "track-progress";

/** Version du format persisté, reprise dans les fichiers exportés. */
export const STORAGE_VERSION = 2;

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

/** Dernière suppression, gardée en mémoire le temps de proposer une annulation. */
export type Deletion =
  | { type: "entry"; exerciseId: string; entry: LogEntry; index: number }
  | { type: "exercise"; exercise: Exercise; index: number; tracking: Tracking | undefined };

export interface TrackerSnapshot {
  exercises: Exercise[];
  trackings: Record<string, Tracking>;
}

interface TrackerState extends TrackerSnapshot {
  lastDeletion: Deletion | null;
  addExercise: (input: NewExercise) => Exercise;
  removeExercise: (exerciseId: string) => void;
  startTracking: (exerciseId: string, reference: number) => void;
  updateReference: (exerciseId: string, reference: number) => void;
  setGoal: (exerciseId: string, goal: Goal) => void;
  setNote: (exerciseId: string, note: string) => void;
  undoDelete: () => void;
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

  if (!Array.isArray(snapshot.exercises)) {
    return { exercises: buildDefaultExercises(), trackings };
  }

  if (version >= 2) {
    return { exercises: snapshot.exercises, trackings };
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

  return { exercises: [...upgraded, ...added], trackings };
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      exercises: buildDefaultExercises(),
      trackings: {},
      lastDeletion: null,

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

          return {
            exercises: state.exercises.filter((item) => item.id !== exerciseId),
            trackings,
            lastDeletion: { type: "exercise", exercise, index, tracking },
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

      /** Remet la dernière suppression à sa place exacte, historique compris. */
      undoDelete: () => {
        const deletion = get().lastDeletion;
        if (!deletion) {
          return;
        }

        set((state) => {
          if (deletion.type === "exercise") {
            const exercises = [...state.exercises];
            exercises.splice(deletion.index, 0, deletion.exercise);

            return {
              exercises,
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
        set({ exercises: snapshot.exercises, trackings: snapshot.trackings });
      },

      mergeAll: (snapshot) => {
        set((state) => mergeSnapshots({ exercises: state.exercises, trackings: state.trackings }, snapshot));
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ exercises, trackings }) => ({ exercises, trackings }),
      migrate: migrateSnapshot,
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
