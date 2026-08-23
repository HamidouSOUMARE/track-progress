"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDefaultExercises } from "@/data/exercise-catalog";
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

export interface TrackerSnapshot {
  exercises: Exercise[];
  trackings: Record<string, Tracking>;
}

interface TrackerState extends TrackerSnapshot {
  addExercise: (input: NewExercise) => Exercise;
  removeExercise: (exerciseId: string) => void;
  startTracking: (exerciseId: string, reference: number) => void;
  updateReference: (exerciseId: string, reference: number) => void;
  setGoal: (exerciseId: string, goal: Goal) => void;
  logValue: (exerciseId: string, input: LogInput) => LogResult | null;
  removeEntry: (exerciseId: string, entryId: string) => void;
  replaceAll: (snapshot: TrackerSnapshot) => void;
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
          const trackings = { ...state.trackings };
          delete trackings[exerciseId];
          return {
            exercises: state.exercises.filter((exercise) => exercise.id !== exerciseId),
            trackings,
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
        if (!tracking) {
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
        }));
      },

      replaceAll: (snapshot) => {
        set({ exercises: snapshot.exercises, trackings: snapshot.trackings });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
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
