import { localStamp } from "@/data/weekdays";
import type { Exercise, LogEntry, SetLog, Tracking } from "@/lib/types";

/** Repos par défaut, tant que l'exercice n'a pas le sien. */
const DEFAULT_REST_SECONDS = 90;
export const MAX_REST_SECONDS = 600;

/**
 * Un repos explicitement mis à zéro vaut « aucun » ; l'absence de valeur laisse
 * le défaut s'appliquer, pour que le minuteur existe sans avoir à le régler.
 */
export function restSeconds(exercise: Pick<Exercise, "kind" | "rest">): number {
  if (exercise.kind === "mesure") {
    return 0;
  }

  return exercise.rest ?? DEFAULT_REST_SECONDS;
}

export const DEFAULT_TARGET_SETS = 3;
export const MAX_TARGET_SETS = 12;

export function targetSets(exercise: Pick<Exercise, "targetSets">): number {
  return exercise.targetSets ?? DEFAULT_TARGET_SETS;
}

/**
 * Détail des séries. Une entrée saisie avant le mode pas à pas n'en a pas :
 * on la reconstitue à partir du couple séries × répétitions.
 */
export function entrySeries(entry: LogEntry): SetLog[] {
  if (entry.series && entry.series.length > 0) {
    return entry.series;
  }

  if (entry.reps === null) {
    return [];
  }

  return Array.from({ length: Math.max(1, entry.sets ?? 1) }, () => ({
    value: entry.value,
    reps: entry.reps as number,
  }));
}

/** Tonnage : le travail réellement fourni, là où `value` ne dit que la charge. */
export function entryVolume(entry: LogEntry): number {
  return entrySeries(entry).reduce((total, set) => total + set.value * set.reps, 0);
}

/** Une entrée d'avant le mode pas à pas est forcément terminée. */
export function isEntryDone(entry: LogEntry): boolean {
  return entry.done !== false;
}

export function openEntryOn(tracking: Tracking | undefined, day: Date): LogEntry | null {
  return (
    tracking?.entries.find((entry) => isSameDay(entry.date, day) && !isEntryDone(entry)) ?? null
  );
}

export function entryOn(tracking: Tracking | undefined, day: Date): LogEntry | null {
  return tracking?.entries.find((entry) => isSameDay(entry.date, day)) ?? null;
}

export function isSameDay(iso: string, day: Date): boolean {
  return localStamp(new Date(iso)) === localStamp(day);
}

/** Fait : une performance du jour, dont les séries sont terminées. */
export function isDoneOn(tracking: Tracking | undefined, day: Date): boolean {
  return (
    tracking?.entries.some((entry) => isSameDay(entry.date, day) && isEntryDone(entry)) ?? false
  );
}

/** Nombre de séries déjà validées aujourd'hui, séance en cours comprise. */
export function setsDoneOn(tracking: Tracking | undefined, day: Date): number {
  const entry = entryOn(tracking, day);
  return entry ? entrySeries(entry).length : 0;
}

export function countDone(
  exercises: Exercise[],
  trackings: Record<string, Tracking>,
  day: Date,
): number {
  return exercises.filter((exercise) => isDoneOn(trackings[exercise.id], day)).length;
}

/**
 * Dernière performance terminée, celle qu'on veut relire avant de charger. La
 * séance du jour en cours ne compte pas : on veut la fois d'avant.
 */
export function lastPerformance(tracking: Tracking | undefined, day?: Date): LogEntry | null {
  const entries = tracking?.entries ?? [];

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]!;
    if (day && isSameDay(entry.date, day)) {
      continue;
    }
    if (isEntryDone(entry)) {
      return entry;
    }
  }

  return null;
}

/** Répétitions à proposer pour la série suivante, pour valider en un tap. */
export function suggestedReps(
  current: SetLog[],
  previous: LogEntry | null,
  exercise: Pick<Exercise, "targetRepsMax">,
): number | null {
  const lastSet = current.at(-1);
  if (lastSet) {
    return lastSet.reps;
  }

  const previousSets = previous ? entrySeries(previous) : [];
  return previousSets.at(0)?.reps ?? exercise.targetRepsMax ?? null;
}

/**
 * Exercice suivant de la séance : le premier qui reste à faire après celui
 * qu'on vient d'enregistrer, sinon celui d'après dans l'ordre du programme.
 */
export function nextInSession(
  plannedIds: string[],
  exercises: Exercise[],
  trackings: Record<string, Tracking>,
  currentId: string,
  day: Date,
): Exercise | null {
  const position = plannedIds.indexOf(currentId);
  if (position < 0) {
    return null;
  }

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  for (const id of plannedIds.slice(position + 1)) {
    const exercise = byId.get(id);
    if (exercise && !exercise.archived && !isDoneOn(trackings[id], day)) {
      return exercise;
    }
  }

  return null;
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}
