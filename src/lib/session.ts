import { localStamp } from "@/data/weekdays";
import type { Exercise, LogEntry, Tracking } from "@/lib/types";

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

export function isSameDay(iso: string, day: Date): boolean {
  return localStamp(new Date(iso)) === localStamp(day);
}

/** Un exercice est fait quand une performance porte la date du jour consulté. */
export function isDoneOn(tracking: Tracking | undefined, day: Date): boolean {
  return tracking?.entries.some((entry) => isSameDay(entry.date, day)) ?? false;
}

export function countDone(
  exercises: Exercise[],
  trackings: Record<string, Tracking>,
  day: Date,
): number {
  return exercises.filter((exercise) => isDoneOn(trackings[exercise.id], day)).length;
}

/** Dernière performance enregistrée, celle qu'on veut relire avant de charger. */
export function lastPerformance(tracking: Tracking | undefined): LogEntry | null {
  return tracking?.entries.at(-1) ?? null;
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
