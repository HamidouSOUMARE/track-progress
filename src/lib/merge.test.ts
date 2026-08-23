import { describe, expect, it } from "vitest";
import { emptyWeek } from "@/data/weekdays";
import { mergeSnapshots } from "@/lib/merge";
import type { Exercise, LogEntry, Tracking } from "@/lib/types";
import type { TrackerSnapshot } from "@/store/tracker-store";

function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    group: "jambes",
    unit: "kg",
    kind: "charge",
    goal: "up",
    custom: false,
    ...overrides,
  };
}

function entry(id: string, value: number, date: string): LogEntry {
  return { id, value, reps: null, sets: null, date };
}

function tracking(exerciseId: string, reference: number, entries: LogEntry[]): Tracking {
  return { exerciseId, reference, referenceDate: "2026-01-05T10:00:00.000Z", entries };
}

function snapshot(overrides: Partial<TrackerSnapshot> = {}): TrackerSnapshot {
  return { exercises: [], trackings: {}, programs: [], activeProgramId: null, ...overrides };
}

const current: TrackerSnapshot = snapshot({
  exercises: [exercise("squat"), exercise("tour-de-taille", { kind: "mesure", goal: "down" })],
  trackings: {
    squat: tracking("squat", 100, [entry("a", 105, "2026-02-01T10:00:00.000Z")]),
  },
});

describe("mergeSnapshots", () => {
  it("conserve les suivis absents du fichier importé", () => {
    const merged = mergeSnapshots(current, snapshot({ exercises: [exercise("squat")] }));

    expect(merged.exercises.map((item) => item.id)).toEqual(["squat", "tour-de-taille"]);
  });

  it("ajoute les suivis inconnus à la suite", () => {
    const merged = mergeSnapshots(current, snapshot({
      exercises: [exercise("rowing-barre")],
      trackings: {},
    }));

    expect(merged.exercises.map((item) => item.id)).toEqual([
      "squat",
      "tour-de-taille",
      "rowing-barre",
    ]);
  });

  it("met à jour les suivis communs avec le contenu du fichier", () => {
    const merged = mergeSnapshots(current, snapshot({
      exercises: [exercise("tour-de-taille", { kind: "mesure", goal: "up", name: "Tour de taille" })],
      trackings: {},
    }));

    const waist = merged.exercises.find((item) => item.id === "tour-de-taille");
    expect(waist?.goal).toBe("up");
    expect(waist?.name).toBe("Tour de taille");
  });

  it("réunit les historiques sans doublon et dans l'ordre", () => {
    const merged = mergeSnapshots(current, snapshot({
      exercises: [],
      trackings: {
        squat: tracking("squat", 100, [
          entry("a", 105, "2026-02-01T10:00:00.000Z"),
          entry("b", 102, "2026-01-20T10:00:00.000Z"),
        ]),
      },
    }));

    expect(merged.trackings.squat?.entries.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("garde la référence en place quand les deux côtés suivent le même exercice", () => {
    const merged = mergeSnapshots(current, snapshot({
      exercises: [],
      trackings: { squat: tracking("squat", 60, []) },
    }));

    expect(merged.trackings.squat?.reference).toBe(100);
  });

  it("reprend intégralement un suivi que l'app ne connaissait pas", () => {
    const merged = mergeSnapshots(current, snapshot({
      exercises: [exercise("developpe-couche")],
      trackings: {
        "developpe-couche": tracking("developpe-couche", 80, [
          entry("c", 85, "2026-02-10T10:00:00.000Z"),
        ]),
      },
    }));

    expect(merged.trackings["developpe-couche"]?.reference).toBe(80);
    expect(merged.trackings["developpe-couche"]?.entries).toHaveLength(1);
  });

  it("ajoute les programmes du fichier sans supprimer les miens", () => {
    const mine = { id: "ppl", name: "PPL", days: emptyWeek() };
    const theirs = { id: "fullbody", name: "Full body", days: emptyWeek() };

    const merged = mergeSnapshots(snapshot({ programs: [mine] }), snapshot({ programs: [theirs] }));

    expect(merged.programs.map((program) => program.id)).toEqual(["ppl", "fullbody"]);
  });

  it("met à jour un programme commun avec la version du fichier", () => {
    const days = emptyWeek();
    days.lundi = ["squat"];

    const merged = mergeSnapshots(
      snapshot({ programs: [{ id: "ppl", name: "PPL", days: emptyWeek() }] }),
      snapshot({ programs: [{ id: "ppl", name: "PPL v2", days }] }),
    );

    expect(merged.programs[0]?.name).toBe("PPL v2");
    expect(merged.programs[0]?.days.lundi).toEqual(["squat"]);
  });

  it("ne change pas le programme suivi localement", () => {
    const merged = mergeSnapshots(
      snapshot({ activeProgramId: "ppl" }),
      snapshot({ activeProgramId: "fullbody" }),
    );

    expect(merged.activeProgramId).toBe("ppl");
  });
});
