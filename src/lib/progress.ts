import type { Exercise, LogEntry, Progress, Tracking, Unit } from "@/lib/types";

/** Incréments proposés en un tap dans la fiche de mise à jour. */
const INCREMENTS: Record<Unit, readonly number[]> = {
  kg: [1.25, 2.5, 5],
  rep: [1, 2, 5],
  sec: [5, 10, 15],
};

export function getIncrements(unit: Unit): readonly number[] {
  return INCREMENTS[unit];
}

function lastEntry(tracking: Tracking): LogEntry | null {
  return tracking.entries.at(-1) ?? null;
}

export function computeProgress(tracking: Tracking): Progress {
  const values = tracking.entries.map((entry) => entry.value);
  const latest = lastEntry(tracking);
  const current = latest?.value ?? tracking.reference;
  const best = values.length > 0 ? Math.max(...values, tracking.reference) : tracking.reference;
  const delta = current - tracking.reference;

  return {
    reference: tracking.reference,
    current,
    best,
    delta,
    ratio: tracking.reference > 0 ? delta / tracking.reference : 0,
    entryCount: tracking.entries.length,
    lastUpdate: latest?.date ?? null,
  };
}

/** Une valeur est un record si elle dépasse strictement tout ce qui a été enregistré. */
export function isRecord(tracking: Tracking, value: number): boolean {
  return value > computeProgress(tracking).best;
}

/**
 * Série de valeurs destinée au sparkline : la référence puis chaque mise à jour.
 * Toujours au moins deux points pour qu'une ligne soit traçable.
 */
export function toSeries(tracking: Tracking): number[] {
  const points = [tracking.reference, ...tracking.entries.map((entry) => entry.value)];
  return points.length > 1 ? points : [tracking.reference, tracking.reference];
}

export interface Summary {
  trackedCount: number;
  improvedCount: number;
  /** Somme des kilos gagnés, tous exercices en charge confondus. */
  kilosGained: number;
  bestRatio: number;
  bestRatioExerciseId: string | null;
}

export function summarize(exercises: Exercise[], trackings: Tracking[]): Summary {
  const unitById = new Map(exercises.map((exercise) => [exercise.id, exercise.unit]));

  return trackings.reduce<Summary>(
    (summary, tracking) => {
      const progress = computeProgress(tracking);
      const improved = progress.delta > 0;
      const isWeighted = unitById.get(tracking.exerciseId) === "kg";
      const beatsBest = improved && progress.ratio > summary.bestRatio;

      return {
        trackedCount: summary.trackedCount + 1,
        improvedCount: summary.improvedCount + (improved ? 1 : 0),
        kilosGained: summary.kilosGained + (isWeighted && improved ? progress.delta : 0),
        bestRatio: beatsBest ? progress.ratio : summary.bestRatio,
        bestRatioExerciseId: beatsBest ? tracking.exerciseId : summary.bestRatioExerciseId,
      };
    },
    {
      trackedCount: 0,
      improvedCount: 0,
      kilosGained: 0,
      bestRatio: 0,
      bestRatioExerciseId: null,
    },
  );
}

/** Nombre de jours distincts avec au moins une mise à jour, sur les 30 derniers jours. */
export function countActiveDays(trackings: Tracking[], now = new Date()): number {
  const floor = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const days = new Set<string>();

  for (const tracking of trackings) {
    for (const entry of tracking.entries) {
      const time = new Date(entry.date).getTime();
      if (time >= floor) {
        days.add(entry.date.slice(0, 10));
      }
    }
  }

  return days.size;
}
