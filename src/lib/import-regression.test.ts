import { describe, expect, it } from "vitest";
import { parseSnapshot, readSnapshot } from "@/lib/backup";
import { getMuscleGroup } from "@/data/muscle-groups";
import fixture from "@/lib/__fixtures__/programme-importe.json";

/**
 * Ce fichier, écrit à la main avec des groupes plus fins que ceux de l'app
 * (biceps, quadriceps…), rendait l'app inaffichable après import.
 */
const raw = JSON.stringify(fixture);

describe("import d'un programme aux groupes plus fins", () => {
  it("est accepté sans erreur", () => {
    expect(() => parseSnapshot(raw)).not.toThrow();
  });

  it("rattache chaque exercice à un groupe que l'app sait afficher", () => {
    const snapshot = parseSnapshot(raw);

    for (const exercise of snapshot.exercises) {
      expect(() => getMuscleGroup(exercise.group)).not.toThrow();
      expect(getMuscleGroup(exercise.group).id).toBe(exercise.group);
    }
  });

  it("place les exercices de bras et de jambes dans les bons groupes", () => {
    const byId = new Map(parseSnapshot(raw).exercises.map((item) => [item.id, item]));

    expect(byId.get("curl-incline")?.group).toBe("bras");
    expect(byId.get("triceps-pushdown")?.group).toBe("bras");
    expect(byId.get("squat")?.group).toBe("jambes");
    expect(byId.get("leg-curl-assis")?.group).toBe("jambes");
    expect(byId.get("mollets-debout")?.group).toBe("jambes");
    expect(byId.get("hip-thrust")?.group).toBe("jambes");
  });

  it("conserve le programme, ses séances et les notes", () => {
    const snapshot = parseSnapshot(raw);

    expect(snapshot.programs[0]?.name).toBe("Recomposition 12 semaines - 5 séances");
    expect(snapshot.programs[0]?.days.mercredi).toEqual([
      "squat",
      "leg-curl-assis",
      "mollets-debout",
    ]);
    expect(snapshot.activeProgramId).toBe("recomposition-12-semaines");
    expect(snapshot.exercises.find((item) => item.id === "curl-incline")?.note).toBe("3 x 8-12");
  });

  it("conserve les mensurations et leur sens de progression", () => {
    const snapshot = parseSnapshot(raw);
    const waist = snapshot.exercises.find((item) => item.id === "tour-de-taille");

    expect(waist?.goal).toBe("down");
    expect(waist?.unit).toBe("cm");
    expect(snapshot.trackings["tour-de-taille"]?.reference).toBe(89);
  });

  it("garde la trace des groupes rattachés pour pouvoir le signaler", () => {
    expect(readSnapshot(raw).remappedGroups).toEqual([
      "biceps",
      "fessiers",
      "ischios",
      "mollets",
      "quadriceps",
      "triceps",
    ]);
  });
});
