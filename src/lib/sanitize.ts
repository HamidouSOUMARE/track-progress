import { isKnownGroup } from "@/data/muscle-groups";
import { WEEKDAYS, emptyWeek } from "@/data/weekdays";
import { MAX_REST_SECONDS } from "@/lib/session";
import type { Exercise, MuscleGroupId, Program, TrackKind, Unit } from "@/lib/types";
import type { TrackerSnapshot } from "@/store/tracker-store";

/**
 * Découpages courants qu'on rattache aux groupes de l'app. Un programme écrit
 * ailleurs parle volontiers de « quadriceps » là où l'app dit « jambes ».
 */
const GROUP_ALIASES: Record<string, MuscleGroupId> = {
  biceps: "bras",
  triceps: "bras",
  "avant-bras": "bras",
  "avant bras": "bras",
  quadriceps: "jambes",
  quadris: "jambes",
  ischios: "jambes",
  "ischio-jambiers": "jambes",
  mollets: "jambes",
  fessiers: "jambes",
  adducteurs: "jambes",
  cuisses: "jambes",
  trapezes: "dos",
  "trapèzes": "dos",
  lombaires: "dos",
  deltoides: "epaules",
  "deltoïdes": "epaules",
  pecs: "pectoraux",
  poitrine: "pectoraux",
  gainage: "abdos",
  core: "abdos",
  mensuration: "mensurations",
};

const UNITS: readonly Unit[] = ["kg", "rep", "sec", "cm"];
const KINDS: readonly TrackKind[] = ["charge", "mesure"];

export function resolveGroup(raw: unknown): MuscleGroupId {
  if (typeof raw !== "string") {
    return "autres";
  }

  const key = raw.trim().toLowerCase();
  if (isKnownGroup(key)) {
    return key;
  }

  return GROUP_ALIASES[key] ?? "autres";
}

/** Un repos négatif, absurde ou non numérique ne doit pas atteindre le minuteur. */
function sanitizeRest(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }

  return Math.min(MAX_REST_SECONDS, Math.max(0, Math.round(raw)));
}

export function sanitizeExercise(raw: Exercise): Exercise {
  const kind = KINDS.includes(raw.kind) ? raw.kind : "charge";
  const group = resolveGroup(raw.group);

  return {
    ...raw,
    group: kind === "mesure" ? "mensurations" : group,
    unit: UNITS.includes(raw.unit) ? raw.unit : "kg",
    kind,
    goal: raw.goal === "down" ? "down" : "up",
    rest: sanitizeRest(raw.rest),
    custom: raw.custom !== false,
  };
}

/**
 * Normalise la semaine sans toucher au contenu : un fichier peut ne contenir
 * qu'un programme dont les exercices existent déjà dans l'app.
 */
function sanitizeProgram(program: Program): Program {
  const days = emptyWeek();

  for (const weekday of WEEKDAYS) {
    const planned = program.days?.[weekday.id];
    if (Array.isArray(planned)) {
      days[weekday.id] = planned.filter((id): id is string => typeof id === "string");
    }
  }

  return { ...program, days };
}

/**
 * Met une sauvegarde en conformité avec ce que l'app sait afficher. Tout ce qui
 * est douteux est ramené à une valeur sûre plutôt que rejeté : un fichier
 * presque valide ne doit ni bloquer l'import, ni casser le rendu ensuite.
 */
export function sanitizeSnapshot(snapshot: TrackerSnapshot): TrackerSnapshot {
  const exercises = snapshot.exercises
    .filter((exercise) => exercise !== null && typeof exercise?.id === "string")
    .map(sanitizeExercise);

  const knownIds = new Set(exercises.map((exercise) => exercise.id));

  const trackings = Object.fromEntries(
    Object.entries(snapshot.trackings).filter(
      ([exerciseId, tracking]) => knownIds.has(exerciseId) && Array.isArray(tracking?.entries),
    ),
  );

  const programs = snapshot.programs
    .filter((program) => typeof program?.id === "string")
    .map(sanitizeProgram);

  const programIds = new Set(programs.map((program) => program.id));
  const activeProgramId =
    snapshot.activeProgramId && programIds.has(snapshot.activeProgramId)
      ? snapshot.activeProgramId
      : (programs[0]?.id ?? null);

  return { exercises, trackings, programs, activeProgramId };
}

/** Groupes du fichier qui ont été rattachés ailleurs, pour pouvoir le dire. */
export function collectRemappedGroups(snapshot: TrackerSnapshot): string[] {
  const remapped = new Set<string>();

  for (const exercise of snapshot.exercises) {
    const raw = typeof exercise?.group === "string" ? exercise.group.trim().toLowerCase() : "";
    if (raw && !isKnownGroup(raw)) {
      remapped.add(raw);
    }
  }

  return [...remapped].sort();
}
