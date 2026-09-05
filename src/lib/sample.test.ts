import { describe, expect, it } from "vitest";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { parseSnapshot } from "@/lib/backup";
import { STORAGE_VERSION } from "@/store/tracker-store";
import { buildSampleSnapshot, sampleJson } from "@/lib/sample";
import type { Exercise, LogEntry } from "@/lib/types";

/**
 * Champs que l'exemple doit montrer. Ajouter un champ au modèle casse ce
 * tableau à la compilation : impossible d'enrichir le format sans décider si
 * l'exemple doit l'illustrer. Générer le fichier depuis les types garantissait
 * qu'il reste valide, pas qu'il reste complet — c'est ce garde-fou qui manquait.
 */
const EXERCISE_FIELDS: Record<keyof Exercise, boolean> = {
  id: true,
  name: true,
  group: true,
  unit: true,
  kind: true,
  goal: true,
  custom: true,
  note: true,
  rest: true,
  targetSets: true,
  targetRepsMin: true,
  targetRepsMax: true,
  // Un suivi masqué serait invisible après import : déroutant dans un exemple.
  archived: false,
};

const ENTRY_FIELDS: Record<keyof LogEntry, boolean> = {
  id: true,
  value: true,
  date: true,
  series: true,
  done: true,
  // Hérités de la saisie rapide, remplacés par `series` : on ne les met plus en avant.
  reps: false,
  sets: false,
};

function illustratedFields(items: object[]): Set<string> {
  return new Set(items.flatMap((item) => Object.keys(item)));
}

describe("sauvegarde d'exemple", () => {
  it("illustre chaque champ d'exercice que le modèle attend", () => {
    const shown = illustratedFields(JSON.parse(sampleJson()).exercises);

    for (const [field, expected] of Object.entries(EXERCISE_FIELDS)) {
      expect(shown.has(field), `champ « ${field} » absent de l'exemple`).toBe(expected);
    }
  });

  it("illustre chaque champ de performance que le modèle attend", () => {
    const trackings: Record<string, { entries: LogEntry[] }> = JSON.parse(sampleJson()).trackings;
    const shown = illustratedFields(Object.values(trackings).flatMap((item) => item.entries));

    for (const [field, expected] of Object.entries(ENTRY_FIELDS)) {
      expect(shown.has(field), `champ « ${field} » absent de l'exemple`).toBe(expected);
    }
  });

  it("porte la version de format en cours", () => {
    expect(JSON.parse(sampleJson()).version).toBe(STORAGE_VERSION);
  });

  it("montre une séance série par série", () => {
    const [first] = buildSampleSnapshot().trackings["exemple-developpe-couche"]?.entries ?? [];

    expect(first?.series).toHaveLength(4);
    expect(first?.value).toBe(62.5);
    expect(first?.done).toBe(true);
  });

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
