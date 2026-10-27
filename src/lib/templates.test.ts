import { describe, expect, it } from "vitest";
import { buildDefaultExercises, findCatalogEntry } from "@/data/exercise-catalog";
import { DAY_LAYOUTS, PROGRAM_TEMPLATES, findTemplate } from "@/data/program-templates";
import { adoptTemplate } from "@/lib/templates";
import type { Exercise } from "@/lib/types";

describe("modèles de programmes", () => {
  it("ne citent que des exercices du catalogue", () => {
    const missing = PROGRAM_TEMPLATES.flatMap((template) =>
      template.variants.flatMap((variant) =>
        variant.sessions.flatMap((session) =>
          session.slots
            .filter((slot) => findCatalogEntry(slot.exerciseId) === null)
            .map((slot) => `${template.id} : ${slot.exerciseId}`),
        ),
      ),
    );

    expect(missing).toEqual([]);
  });

  it("prévoient une séance par jour d'entraînement", () => {
    for (const template of PROGRAM_TEMPLATES) {
      const days = template.variants.map((variant) => variant.days);
      expect(new Set(days).size, template.id).toBe(days.length);

      for (const variant of template.variants) {
        expect(variant.sessions, `${template.id} ${variant.days} j`).toHaveLength(
          DAY_LAYOUTS[variant.days].length,
        );
      }
    }
  });

  it("donnent un identifiant unique à chaque modèle", () => {
    const ids = PROGRAM_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("adoptTemplate", () => {
  const force = findTemplate("force")!;

  it("pose les séances sur les jours du rythme choisi", () => {
    const adopted = adoptTemplate(force, 3, buildDefaultExercises())!;
    const [a, b] = adopted.program.workouts;

    expect(adopted.program.name).toBe("Force 5×5 · 3 jours");
    // La séance A revient deux fois dans la semaine : elle n'est créée qu'une fois.
    expect(adopted.program.workouts).toHaveLength(2);
    expect(adopted.program.days.lundi).toEqual([a?.id]);
    expect(adopted.program.days.mercredi).toEqual([b?.id]);
    expect(adopted.program.days.vendredi).toEqual([a?.id]);
    expect(adopted.program.days.samedi).toEqual([]);
  });

  it("garde les réglages déjà choisis et complète les autres", () => {
    const current = buildDefaultExercises().map<Exercise>((exercise) =>
      exercise.id === "squat" ? { ...exercise, rest: 240, note: "Pieds écartés" } : exercise,
    );

    const adopted = adoptTemplate(force, 3, current)!;
    const squat = adopted.exercises.find((exercise) => exercise.id === "squat");

    expect(squat?.rest).toBe(240);
    expect(squat?.note).toBe("Pieds écartés");
    expect(squat?.targetSets).toBe(5);
    expect(squat?.targetRepsMin).toBe(5);
    expect(squat?.targetRepsMax).toBe(5);
  });

  it("n'ajoute que les exercices absents de la bibliothèque", () => {
    const current = buildDefaultExercises();
    const adopted = adoptTemplate(findTemplate("fessiers-jambes")!, 2, current)!;
    const ids = adopted.exercises.map((exercise) => exercise.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, current.length)).toEqual(current.map((exercise) => exercise.id));
    expect(adopted.exercises.find((exercise) => exercise.id === "hip-thrust")).toMatchObject({
      group: "fessiers",
      kind: "charge",
      custom: false,
      targetSets: 4,
    });
  });

  it("réaffiche un exercice masqué dont le programme a besoin", () => {
    const current = buildDefaultExercises().map<Exercise>((exercise) =>
      exercise.id === "rowing-barre" ? { ...exercise, archived: true } : exercise,
    );

    const adopted = adoptTemplate(force, 2, current)!;

    expect(adopted.exercises.find((exercise) => exercise.id === "rowing-barre")?.archived).toBe(
      false,
    );
  });

  it("refuse un rythme que le modèle ne propose pas", () => {
    expect(adoptTemplate(force, 5, buildDefaultExercises())).toBeNull();
  });
});
