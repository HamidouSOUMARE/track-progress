import { describe, expect, it } from "vitest";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { parseSnapshot } from "@/lib/backup";
import { buildSampleSnapshot, sampleJson } from "@/lib/sample";

describe("sauvegarde d'exemple", () => {
  it("se relit par l'import sans être rejetée", () => {
    const snapshot = parseSnapshot(sampleJson());

    expect(snapshot.exercises.some((exercise) => exercise.id === "exemple-developpe-couche")).toBe(
      true,
    );
    expect(snapshot.programs[0]?.days.lundi).toEqual([
      "exemple-developpe-couche",
      "exemple-tractions",
    ]);
  });

  it("n'écrase aucun exercice du catalogue si on l'importe par erreur", () => {
    const catalogIds = new Set(buildDefaultExercises().map((exercise) => exercise.id));
    const sampleIds = buildSampleSnapshot().exercises.map((exercise) => exercise.id);

    expect(sampleIds.some((id) => catalogIds.has(id))).toBe(false);
  });

  it("illustre les deux sens de progression et les trois unités utiles", () => {
    const { exercises } = buildSampleSnapshot();

    expect(exercises.map((exercise) => exercise.unit)).toEqual(["kg", "rep", "cm"]);
    expect(exercises.some((exercise) => exercise.goal === "down")).toBe(true);
    expect(exercises.some((exercise) => exercise.kind === "mesure")).toBe(true);
  });

  it("chaque historique pointe vers un exercice décrit dans le fichier", () => {
    const { exercises, trackings, programs } = buildSampleSnapshot();
    const ids = new Set(exercises.map((exercise) => exercise.id));

    for (const tracking of Object.values(trackings)) {
      expect(ids.has(tracking.exerciseId)).toBe(true);
    }

    for (const program of programs) {
      for (const day of Object.values(program.days)) {
        for (const exerciseId of day) {
          expect(ids.has(exerciseId)).toBe(true);
        }
      }
    }
  });
});
