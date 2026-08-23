import type { LogEntry, Tracking } from "@/lib/types";
import type { TrackerSnapshot } from "@/store/tracker-store";

/** Réunit deux historiques sans doublon : les entrées portent des identifiants stables. */
function mergeEntries(current: LogEntry[], incoming: LogEntry[]): LogEntry[] {
  const byId = new Map(current.map((entry) => [entry.id, entry]));

  for (const entry of incoming) {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry);
    }
  }

  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function mergeTracking(current: Tracking, incoming: Tracking): Tracking {
  return {
    ...current,
    // La référence en place fait foi : une fusion ne redéfinit pas le point de départ.
    entries: mergeEntries(current.entries, incoming.entries),
  };
}

/**
 * Fusion non destructive : rien de ce qui existe ne disparaît. Les suivis absents
 * du fichier restent en place, les communs voient leurs historiques réunis, et
 * les nouveaux sont ajoutés à la suite.
 */
export function mergeSnapshots(
  current: TrackerSnapshot,
  incoming: TrackerSnapshot,
): TrackerSnapshot {
  const exercises = new Map(current.exercises.map((exercise) => [exercise.id, exercise]));
  for (const exercise of incoming.exercises) {
    const existing = exercises.get(exercise.id);
    exercises.set(exercise.id, existing ? { ...existing, ...exercise } : exercise);
  }

  const trackings = { ...current.trackings };
  for (const [exerciseId, tracking] of Object.entries(incoming.trackings)) {
    const existing = trackings[exerciseId];
    trackings[exerciseId] = existing ? mergeTracking(existing, tracking) : tracking;
  }

  return { exercises: [...exercises.values()], trackings };
}
