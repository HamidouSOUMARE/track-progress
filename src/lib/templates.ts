import { findCatalogEntry } from "@/data/exercise-catalog";
import {
  DAY_LAYOUTS,
  type ProgramTemplate,
  type TemplateDays,
  type TemplateSlot,
} from "@/data/program-templates";
import { emptyWeek } from "@/data/weekdays";
import { createId } from "@/lib/id";
import type { Exercise, Program, Workout } from "@/lib/types";

export interface AdoptedTemplate {
  exercises: Exercise[];
  program: Program;
}

/**
 * La consigne du modèle ne remplit que ce que l'utilisateur n'a pas réglé :
 * un repos ou un objectif déjà choisi a été pensé, on ne l'écrase pas.
 */
function withPrescription(exercise: Exercise, slot: TemplateSlot): Exercise {
  return {
    ...exercise,
    rest: exercise.rest ?? slot.rest,
    targetSets: exercise.targetSets ?? slot.sets,
    targetRepsMin: exercise.targetRepsMin ?? slot.reps?.[0],
    targetRepsMax: exercise.targetRepsMax ?? slot.reps?.[1],
    // Masqué, il n'apparaîtrait pas dans la séance qu'on vient de choisir.
    ...(exercise.archived ? { archived: false } : {}),
  };
}

function fromCatalog(id: string): Exercise | null {
  const entry = findCatalogEntry(id);
  return entry ? { ...entry, kind: "charge", goal: "up", custom: false } : null;
}

export function variantFor(template: ProgramTemplate, days: TemplateDays) {
  return template.variants.find((variant) => variant.days === days) ?? null;
}

export function templateProgramName(template: ProgramTemplate, days: TemplateDays): string {
  return `${template.name} · ${days} jours`;
}

/**
 * Copie un modèle dans les données de l'utilisateur : le programme lui
 * appartient ensuite, il le modifie comme n'importe quel autre. Les exercices
 * déjà suivis sont repris tels quels, historique compris ; seuls les absents
 * sont ajoutés depuis le catalogue.
 */
export function adoptTemplate(
  template: ProgramTemplate,
  days: TemplateDays,
  current: Exercise[],
): AdoptedTemplate | null {
  const variant = variantFor(template, days);
  if (!variant) {
    return null;
  }

  const exercises = new Map(current.map((exercise) => [exercise.id, exercise]));
  const order = current.map((exercise) => exercise.id);
  const workouts = new Map<string, Workout>();
  const week = emptyWeek();

  variant.sessions.forEach((session, index) => {
    let created = workouts.get(session.key);

    if (!created) {
      for (const slot of session.slots) {
        const base = exercises.get(slot.exerciseId) ?? fromCatalog(slot.exerciseId);
        if (!base) {
          continue;
        }

        if (!exercises.has(base.id)) {
          order.push(base.id);
        }
        exercises.set(base.id, withPrescription(base, slot));
      }

      created = {
        id: createId(),
        name: session.name,
        exercises: session.slots
          .map((slot) => slot.exerciseId)
          .filter((id) => exercises.has(id)),
      };
      workouts.set(session.key, created);
    }

    const day = DAY_LAYOUTS[days][index];
    if (day) {
      week[day].push(created.id);
    }
  });

  return {
    exercises: order.map((id) => exercises.get(id)!),
    program: {
      id: createId(),
      name: templateProgramName(template, days),
      workouts: [...workouts.values()],
      days: week,
    },
  };
}
