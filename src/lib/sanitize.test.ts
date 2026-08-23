import { describe, expect, it } from "vitest";
import { emptyWeek } from "@/data/weekdays";
import { collectRemappedGroups, resolveGroup, sanitizeSnapshot } from "@/lib/sanitize";
import type { Exercise } from "@/lib/types";
import type { TrackerSnapshot } from "@/store/tracker-store";

function exercise(overrides: Partial<Exercise> & { id: string }): Exercise {
  return {
    name: overrides.id,
    group: "pectoraux",
    unit: "kg",
    kind: "charge",
    goal: "up",
    custom: true,
    ...overrides,
  };
}

function snapshot(overrides: Partial<TrackerSnapshot> = {}): TrackerSnapshot {
  return { exercises: [], trackings: {}, programs: [], activeProgramId: null, ...overrides };
}

describe("resolveGroup", () => {
  it("rattache les découpages fins aux groupes de l'app", () => {
    expect(resolveGroup("biceps")).toBe("bras");
    expect(resolveGroup("triceps")).toBe("bras");
    expect(resolveGroup("quadriceps")).toBe("jambes");
    expect(resolveGroup("ischios")).toBe("jambes");
    expect(resolveGroup("mollets")).toBe("jambes");
    expect(resolveGroup("fessiers")).toBe("jambes");
  });

  it("laisse passer les groupes déjà connus", () => {
    expect(resolveGroup("pectoraux")).toBe("pectoraux");
    expect(resolveGroup("mensurations")).toBe("mensurations");
  });

  it("ignore la casse et les espaces", () => {
    expect(resolveGroup("  Quadriceps ")).toBe("jambes");
  });

  it("range dans « autres » ce qu'il ne sait pas rattacher", () => {
    expect(resolveGroup("cardio")).toBe("autres");
    expect(resolveGroup(42)).toBe("autres");
    expect(resolveGroup(undefined)).toBe("autres");
  });
});

describe("sanitizeSnapshot", () => {
  it("corrige les groupes inconnus plutôt que de rejeter le fichier", () => {
    const clean = sanitizeSnapshot(
      snapshot({ exercises: [exercise({ id: "curl", group: "biceps" as never })] }),
    );

    expect(clean.exercises[0]?.group).toBe("bras");
  });

  it("force les mensurations dans leur groupe", () => {
    const clean = sanitizeSnapshot(
      snapshot({
        exercises: [exercise({ id: "poids", kind: "mesure", group: "pectoraux", unit: "kg" })],
      }),
    );

    expect(clean.exercises[0]?.group).toBe("mensurations");
  });

  it("ramène une unité ou un objectif douteux à une valeur sûre", () => {
    const clean = sanitizeSnapshot(
      snapshot({
        exercises: [exercise({ id: "x", unit: "livres" as never, goal: "haut" as never })],
      }),
    );

    expect(clean.exercises[0]?.unit).toBe("kg");
    expect(clean.exercises[0]?.goal).toBe("up");
  });

  it("écarte un historique qui ne correspond à aucun exercice", () => {
    const clean = sanitizeSnapshot(
      snapshot({
        exercises: [exercise({ id: "squat" })],
        trackings: {
          squat: { exerciseId: "squat", reference: 100, referenceDate: "", entries: [] },
          fantome: { exerciseId: "fantome", reference: 50, referenceDate: "", entries: [] },
        },
      }),
    );

    expect(Object.keys(clean.trackings)).toEqual(["squat"]);
  });

  it("garde une séance dont les exercices vivent déjà dans l'app", () => {
    const days = emptyWeek();
    days.lundi = ["squat", "developpe-couche"];

    const clean = sanitizeSnapshot(
      snapshot({
        exercises: [],
        programs: [{ id: "p", name: "P", days }],
        activeProgramId: "p",
      }),
    );

    expect(clean.programs[0]?.days.lundi).toEqual(["squat", "developpe-couche"]);
  });

  it("répare un programme suivi qui n'existe pas", () => {
    const clean = sanitizeSnapshot(
      snapshot({
        programs: [{ id: "reel", name: "Réel", days: emptyWeek() }],
        activeProgramId: "disparu",
      }),
    );

    expect(clean.activeProgramId).toBe("reel");
  });

  it("complète une séance dont les jours manquent", () => {
    const clean = sanitizeSnapshot(
      snapshot({
        programs: [{ id: "p", name: "P", days: { lundi: [] } as never }],
      }),
    );

    expect(clean.programs[0]?.days.dimanche).toEqual([]);
  });
});

describe("collectRemappedGroups", () => {
  it("liste les groupes qui ont été rattachés ailleurs", () => {
    const groups = collectRemappedGroups(
      snapshot({
        exercises: [
          exercise({ id: "a", group: "biceps" as never }),
          exercise({ id: "b", group: "quadriceps" as never }),
          exercise({ id: "c", group: "pectoraux" }),
        ],
      }),
    );

    expect(groups).toEqual(["biceps", "quadriceps"]);
  });
});
