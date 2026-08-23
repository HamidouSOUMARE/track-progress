import type { Exercise, Goal, LogEntry, Progress, TrackKind, Tracking, Unit } from "@/lib/types";

/**
 * Incréments proposés en un tap. Un tour de taille ne se déplace pas par
 * paliers de 2,5 comme une barre : ils dépendent donc aussi de ce qu'on suit.
 */
const INCREMENTS: Record<TrackKind, Partial<Record<Unit, readonly number[]>>> = {
  charge: {
    kg: [1.25, 2.5, 5],
    rep: [1, 2, 5],
    sec: [5, 10, 15],
  },
  mesure: {
    kg: [0.2, 0.5, 1],
    cm: [0.5, 1, 2],
  },
};

const FALLBACK_INCREMENTS: readonly number[] = [1, 2, 5];

export function getIncrements(unit: Unit, kind: TrackKind = "charge"): readonly number[] {
  return INCREMENTS[kind][unit] ?? FALLBACK_INCREMENTS;
}

function lastEntry(tracking: Tracking): LogEntry | null {
  return tracking.entries.at(-1) ?? null;
}

/** Retient la valeur la plus avancée dans le sens de l'objectif. */
function keepBest(a: number, b: number, goal: Goal): number {
  return goal === "up" ? Math.max(a, b) : Math.min(a, b);
}

export function computeProgress(tracking: Tracking, goal: Goal = "up"): Progress {
  const latest = lastEntry(tracking);
  const current = latest?.value ?? tracking.reference;
  const best = tracking.entries.reduce(
    (acc, entry) => keepBest(acc, entry.value, goal),
    tracking.reference,
  );
  const delta = current - tracking.reference;
  const gain = goal === "up" ? delta : -delta;

  return {
    reference: tracking.reference,
    current,
    best,
    delta,
    gain,
    ratio: tracking.reference > 0 ? gain / tracking.reference : 0,
    entryCount: tracking.entries.length,
    lastUpdate: latest?.date ?? null,
  };
}

/** Une valeur fait record si elle dépasse strictement tout l'historique, dans le bon sens. */
export function isRecord(tracking: Tracking, value: number, goal: Goal = "up"): boolean {
  const { best } = computeProgress(tracking, goal);
  return goal === "up" ? value > best : value < best;
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
  /** Somme des kilos gagnés sur les charges, mensurations exclues. */
  kilosGained: number;
  /** Nombre de records personnels battus depuis le début. */
  records: number;
  bestRatio: number;
  bestRatioExerciseId: string | null;
}

const EMPTY_SUMMARY: Summary = {
  trackedCount: 0,
  improvedCount: 0,
  kilosGained: 0,
  records: 0,
  bestRatio: 0,
  bestRatioExerciseId: null,
};

/** Nombre de mises à jour qui ont battu le meilleur résultat du moment. */
export function countRecords(tracking: Tracking, goal: Goal = "up"): number {
  let best = tracking.reference;
  let records = 0;

  for (const entry of tracking.entries) {
    const beaten = goal === "up" ? entry.value > best : entry.value < best;
    if (beaten) {
      records += 1;
      best = entry.value;
    }
  }

  return records;
}

export function summarize(exercises: Exercise[], trackings: Tracking[]): Summary {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return trackings.reduce<Summary>((summary, tracking) => {
    const exercise = byId.get(tracking.exerciseId);
    if (!exercise) {
      return summary;
    }

    const progress = computeProgress(tracking, exercise.goal);
    const improved = progress.gain > 0;
    const weighted = exercise.kind === "charge" && exercise.unit === "kg";
    const beatsBest = improved && progress.ratio > summary.bestRatio;

    return {
      trackedCount: summary.trackedCount + 1,
      improvedCount: summary.improvedCount + (improved ? 1 : 0),
      kilosGained: summary.kilosGained + (weighted && improved ? progress.gain : 0),
      records: summary.records + countRecords(tracking, exercise.goal),
      bestRatio: beatsBest ? progress.ratio : summary.bestRatio,
      bestRatioExerciseId: beatsBest ? tracking.exerciseId : summary.bestRatioExerciseId,
    };
  }, EMPTY_SUMMARY);
}
