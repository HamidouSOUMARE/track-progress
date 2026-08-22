"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { isRecord } from "@/lib/progress";
import type { Exercise, LogEntry, MuscleGroupId, Tracking, Unit } from "@/lib/types";

const STORAGE_KEY = "track-progress";

export interface NewExercise {
  name: string;
  group: MuscleGroupId;
  unit: Unit;
}

export interface LogInput {
  value: number;
  reps: number | null;
  sets: number | null;
}

export interface LogResult {
  record: boolean;
  delta: number;
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

      logValue: (exerciseId, input) => {
        const tracking = get().trackings[exerciseId];
        if (!tracking) {
          return null;
        }

        const previous = tracking.entries.at(-1)?.value ?? tracking.reference;
        const record = isRecord(tracking, input.value);

        set((state) => ({
          trackings: {
            ...state.trackings,
            [exerciseId]: { ...tracking, entries: [...tracking.entries, createEntry(input)] },
          },
        }));

        return { record, delta: input.value - previous, previous };
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ exercises, trackings }) => ({ exercises, trackings }),
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
