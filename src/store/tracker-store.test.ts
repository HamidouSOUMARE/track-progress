import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultExercises } from "@/data/exercise-catalog";
import { migrateSnapshot, useTrackerStore } from "@/store/tracker-store";

const store = () => useTrackerStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTrackerStore.setState({
    exercises: buildDefaultExercises(),
    trackings: {},
    programs: [],
    activeProgramId: null,
    lastDeletion: null,
  });
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

describe("setNote", () => {
  it("attache une note à un suivi", () => {
    store().setNote("squat", "Barre au niveau des trapèzes, cran 7");

    expect(store().exercises.find((exercise) => exercise.id === "squat")?.note).toBe(
      "Barre au niveau des trapèzes, cran 7",
    );
  });

  it("efface la note quand il ne reste que des espaces", () => {
    store().setNote("squat", "Cran 7");
    store().setNote("squat", "   ");

    expect(store().exercises.find((exercise) => exercise.id === "squat")?.note).toBeUndefined();
  });
});

describe("undoDelete", () => {
  it("remet une performance supprimée à sa place dans l'historique", () => {
    store().startTracking("squat", 100);
    store().logValue("squat", { value: 105, reps: null, sets: null });
    store().logValue("squat", { value: 110, reps: null, sets: null });
    const first = store().trackings.squat?.entries[0]?.id;

    store().removeEntry("squat", first!);
    expect(store().trackings.squat?.entries).toHaveLength(1);

    store().undoDelete();

    expect(store().trackings.squat?.entries.map((entry) => entry.value)).toEqual([105, 110]);
  });

  it("restaure un suivi supprimé avec son historique et son rang", () => {
    const before = store().exercises.map((exercise) => exercise.id);
    store().startTracking("squat", 100);
    store().logValue("squat", { value: 105, reps: null, sets: null });

    store().removeExercise("squat");
    expect(store().trackings.squat).toBeUndefined();

    store().undoDelete();

    expect(store().exercises.map((exercise) => exercise.id)).toEqual(before);
    expect(store().trackings.squat?.entries).toHaveLength(1);
  });

  it("ne fait rien quand il n'y a rien à annuler", () => {
    const before = store().exercises.length;
    store().undoDelete();

    expect(store().exercises).toHaveLength(before);
  });
});

describe("programmes", () => {
  it("active le premier programme créé", () => {
    const program = store().createProgram("Push Pull Legs");

    expect(store().programs).toHaveLength(1);
    expect(store().activeProgramId).toBe(program.id);
  });

  it("garde le programme suivi quand on en crée un second", () => {
    const first = store().createProgram("PPL");
    store().createProgram("Full body");

    expect(store().activeProgramId).toBe(first.id);
  });

  it("place et retire un exercice sur un jour", () => {
    const program = store().createProgram("PPL");

    store().toggleExerciseInDay(program.id, "lundi", "squat");
    expect(store().programs[0]?.days.lundi).toEqual(["squat"]);

    store().toggleExerciseInDay(program.id, "lundi", "squat");
    expect(store().programs[0]?.days.lundi).toEqual([]);
  });

  it("réordonne les exercices d'une séance", () => {
    const program = store().createProgram("PPL");
    store().toggleExerciseInDay(program.id, "lundi", "squat");
    store().toggleExerciseInDay(program.id, "lundi", "presse-a-cuisses");
    store().toggleExerciseInDay(program.id, "lundi", "leg-curl");

    store().moveExerciseInDay(program.id, "lundi", "leg-curl", -1);

    expect(store().programs[0]?.days.lundi).toEqual(["squat", "leg-curl", "presse-a-cuisses"]);
  });

  it("ignore un déplacement hors des bornes", () => {
    const program = store().createProgram("PPL");
    store().toggleExerciseInDay(program.id, "lundi", "squat");

    store().moveExerciseInDay(program.id, "lundi", "squat", -1);

    expect(store().programs[0]?.days.lundi).toEqual(["squat"]);
  });

  it("bascule sur un autre programme quand le programme suivi est supprimé", () => {
    const first = store().createProgram("PPL");
    const second = store().createProgram("Full body");

    store().deleteProgram(first.id);

    expect(store().activeProgramId).toBe(second.id);
  });

  it("restaure un programme supprimé, son rang et son statut", () => {
    const first = store().createProgram("PPL");
    store().createProgram("Full body");
    store().toggleExerciseInDay(first.id, "mardi", "squat");

    store().deleteProgram(first.id);
    store().undoDelete();

    expect(store().programs[0]?.name).toBe("PPL");
    expect(store().programs[0]?.days.mardi).toEqual(["squat"]);
    expect(store().activeProgramId).toBe(first.id);
  });
});

describe("masquer un suivi", () => {
  it("masque sans toucher à l'historique", () => {
    store().startTracking("squat", 100);
    store().setArchived("squat", true);

    expect(store().exercises.find((exercise) => exercise.id === "squat")?.archived).toBe(true);
    expect(store().trackings.squat?.reference).toBe(100);
  });

  it("s'annule comme une suppression", () => {
    store().setArchived("squat", true);
    store().undoDelete();

    expect(store().exercises.find((exercise) => exercise.id === "squat")?.archived).toBe(false);
  });
});

describe("suppression et programmes", () => {
  it("retire l'exercice supprimé des séances qui l'utilisaient", () => {
    const program = store().createProgram("PPL");
    store().toggleExerciseInDay(program.id, "lundi", "squat");
    store().toggleExerciseInDay(program.id, "jeudi", "squat");

    store().removeExercise("squat");

    expect(store().programs[0]?.days.lundi).toEqual([]);
    expect(store().programs[0]?.days.jeudi).toEqual([]);
  });

  it("le remet à sa place dans chaque séance à l'annulation", () => {
    const program = store().createProgram("PPL");
    store().toggleExerciseInDay(program.id, "lundi", "presse-a-cuisses");
    store().toggleExerciseInDay(program.id, "lundi", "squat");
    store().toggleExerciseInDay(program.id, "lundi", "leg-curl");

    store().removeExercise("squat");
    store().undoDelete();

    expect(store().programs[0]?.days.lundi).toEqual([
      "presse-a-cuisses",
      "squat",
      "leg-curl",
    ]);
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
    const current = { exercises: [], trackings: {}, programs: [], activeProgramId: null };

    expect(migrateSnapshot(current, 2)).toEqual(current);
  });

  it("repart du catalogue si la sauvegarde est inexploitable", () => {
    expect(migrateSnapshot(null, 1).exercises.length).toBeGreaterThan(0);
  });
});
