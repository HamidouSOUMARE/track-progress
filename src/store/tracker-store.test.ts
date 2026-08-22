import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { useTrackerStore } from "@/store/tracker-store";

const store = () => useTrackerStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTrackerStore.setState({ exercises: buildDefaultExercises(), trackings: {} });
});

describe("addExercise", () => {
  it("crée un exercice personnalisé avec un identifiant lisible", () => {
    const exercise = store().addExercise({ name: "Rowing haltère", group: "dos", unit: "kg" });

    expect(exercise.id).toBe("rowing-haltere");
    expect(exercise.custom).toBe(true);
    expect(store().exercises).toContainEqual(exercise);
  });

  it("évite d'écraser un exercice existant portant le même nom", () => {
    const first = store().addExercise({ name: "Squat", group: "jambes", unit: "kg" });

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

    expect(result).toEqual({ record: true, delta: 5, previous: 105 });
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
    const exercise = store().addExercise({ name: "Pull over", group: "dos", unit: "kg" });
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
