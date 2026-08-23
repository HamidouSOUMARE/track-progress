import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { migrateSnapshot, useTrackerStore } from "@/store/tracker-store";

const store = () => useTrackerStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTrackerStore.setState({ exercises: buildDefaultExercises(), trackings: {} });
});

describe("addExercise", () => {
  it("crée un exercice personnalisé avec un identifiant lisible", () => {
    const exercise = store().addExercise({
      name: "Rowing haltère",
      group: "dos",
      unit: "kg",
      kind: "charge",
      goal: "up",
    });

    expect(exercise.id).toBe("rowing-haltere");
    expect(exercise.custom).toBe(true);
    expect(store().exercises).toContainEqual(exercise);
  });

  it("évite d'écraser un exercice existant portant le même nom", () => {
    const first = store().addExercise({ name: "Squat", group: "jambes", unit: "kg", kind: "charge", goal: "up" });

    expect(first.id).not.toBe("squat");
    expect(store().exercises.filter((exercise) => exercise.name === "Squat")).toHaveLength(2);
  });
});

describe("logValue", () => {
  it("ne fait rien tant qu'aucune référence n'existe", () => {
    expect(store().logValue("squat", { value: 100, reps: null, sets: null })).toBeNull();
  });

  it("signale un record et calcule l'écart avec la performance précédente", () => {
    store().startTracking("squat", 100);
    store().logValue("squat", { value: 105, reps: 8, sets: 4 });

    const result = store().logValue("squat", { value: 110, reps: 6, sets: 4 });

    expect(result).toEqual({ record: true, delta: 5, gain: 5, previous: 105 });
    expect(store().trackings.squat?.entries).toHaveLength(2);
  });

  it("ne déclare pas de record lors d'une séance en dessous du meilleur", () => {
    store().startTracking("squat", 100);
    store().logValue("squat", { value: 120, reps: null, sets: null });

    expect(store().logValue("squat", { value: 110, reps: null, sets: null })?.record).toBe(false);
  });
});

describe("removeExercise", () => {
  it("supprime aussi le suivi associé", () => {
    const exercise = store().addExercise({ name: "Pull over", group: "dos", unit: "kg", kind: "charge", goal: "up" });
    store().startTracking(exercise.id, 30);

    store().removeExercise(exercise.id);

    expect(store().trackings[exercise.id]).toBeUndefined();
    expect(store().exercises.some((item) => item.id === exercise.id)).toBe(false);
  });
});

describe("removeEntry", () => {
  it("retire une performance de l'historique sans toucher à la référence", () => {
    store().startTracking("squat", 100);
    store().logValue("squat", { value: 105, reps: null, sets: null });
    const entryId = store().trackings.squat?.entries[0]?.id;

    store().removeEntry("squat", entryId!);

    expect(store().trackings.squat?.entries).toHaveLength(0);
    expect(store().trackings.squat?.reference).toBe(100);
  });
});

describe("mensurations", () => {
  it("crée une mesure orientée à la baisse", () => {
    const measure = store().addExercise({
      name: "Tour de hanches",
      group: "mensurations",
      unit: "cm",
      kind: "mesure",
      goal: "down",
    });

    expect(measure.kind).toBe("mesure");
    expect(measure.goal).toBe("down");
  });

  it("compte une baisse comme une progression et un record", () => {
    store().startTracking("tour-de-taille", 85);

    const result = store().logValue("tour-de-taille", { value: 83, reps: null, sets: null });

    expect(result).toEqual({ record: true, delta: -2, gain: 2, previous: 85 });
  });

  it("inverse le sens de lecture quand on change d'objectif", () => {
    store().setGoal("tour-de-taille", "up");
    store().startTracking("tour-de-taille", 85);

    expect(store().logValue("tour-de-taille", { value: 83, reps: null, sets: null })).toEqual({
      record: false,
      delta: -2,
      gain: -2,
      previous: 85,
    });
  });
});

describe("updateReference", () => {
  it("démarre un suivi si l'exercice n'en avait pas", () => {
    store().updateReference("squat", 90);

    expect(store().trackings.squat?.reference).toBe(90);
    expect(store().trackings.squat?.entries).toEqual([]);
  });

  it("conserve l'historique quand la référence change", () => {
    store().startTracking("squat", 100);
    store().logValue("squat", { value: 105, reps: null, sets: null });

    store().updateReference("squat", 95);

    expect(store().trackings.squat?.reference).toBe(95);
    expect(store().trackings.squat?.entries).toHaveLength(1);
  });
});

describe("migrateSnapshot", () => {
  const v1 = {
    exercises: [{ id: "squat", name: "Squat", group: "jambes", unit: "kg", custom: false }],
    trackings: {
      squat: {
        exerciseId: "squat",
        reference: 100,
        referenceDate: "2026-02-01T10:00:00.000Z",
        entries: [],
      },
    },
  };

  it("complète les exercices d'avant les mensurations", () => {
    const migrated = migrateSnapshot(v1, 1);
    const squat = migrated.exercises.find((exercise) => exercise.id === "squat");

    expect(squat?.kind).toBe("charge");
    expect(squat?.goal).toBe("up");
  });

  it("ajoute les mensurations par défaut sans toucher à l'historique", () => {
    const migrated = migrateSnapshot(v1, 1);

    expect(migrated.exercises.some((exercise) => exercise.id === "tour-de-taille")).toBe(true);
    expect(migrated.trackings.squat?.reference).toBe(100);
  });

  it("laisse passer une sauvegarde déjà à jour", () => {
    const current = { exercises: [], trackings: {} };

    expect(migrateSnapshot(current, 2)).toEqual(current);
  });

  it("repart du catalogue si la sauvegarde est inexploitable", () => {
    expect(migrateSnapshot(null, 1).exercises.length).toBeGreaterThan(0);
  });
});
