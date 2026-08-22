import type { Exercise } from "@/lib/types";

type CatalogEntry = Omit<Exercise, "custom">;

/**
 * Catalogue par défaut proposé au premier lancement.
 * L'utilisateur peut en masquer et ajouter ses propres exercices.
 */
export const EXERCISE_CATALOG: readonly CatalogEntry[] = [
  { id: "developpe-couche", name: "Développé couché", group: "pectoraux", unit: "kg" },
  { id: "developpe-incline", name: "Développé incliné haltères", group: "pectoraux", unit: "kg" },
  { id: "ecarte-poulie", name: "Écarté à la poulie", group: "pectoraux", unit: "kg" },
  { id: "dips", name: "Dips lestés", group: "pectoraux", unit: "kg" },

  { id: "souleve-de-terre", name: "Soulevé de terre", group: "dos", unit: "kg" },
  { id: "rowing-barre", name: "Rowing barre", group: "dos", unit: "kg" },
  { id: "tirage-vertical", name: "Tirage vertical", group: "dos", unit: "kg" },
  { id: "tractions", name: "Tractions", group: "dos", unit: "rep" },

  { id: "squat", name: "Squat", group: "jambes", unit: "kg" },
  { id: "presse-a-cuisses", name: "Presse à cuisses", group: "jambes", unit: "kg" },
  { id: "fentes", name: "Fentes haltères", group: "jambes", unit: "kg" },
  { id: "leg-curl", name: "Leg curl", group: "jambes", unit: "kg" },
  { id: "mollets", name: "Mollets debout", group: "jambes", unit: "kg" },

  { id: "developpe-militaire", name: "Développé militaire", group: "epaules", unit: "kg" },
  { id: "elevations-laterales", name: "Élévations latérales", group: "epaules", unit: "kg" },
  { id: "oiseau", name: "Oiseau", group: "epaules", unit: "kg" },

  { id: "curl-barre", name: "Curl barre", group: "bras", unit: "kg" },
  { id: "curl-halteres", name: "Curl haltères", group: "bras", unit: "kg" },
  { id: "extension-poulie", name: "Extension poulie triceps", group: "bras", unit: "kg" },
  { id: "barre-au-front", name: "Barre au front", group: "bras", unit: "kg" },

  { id: "crunch-poulie", name: "Crunch à la poulie", group: "abdos", unit: "kg" },
  { id: "releve-de-jambes", name: "Relevé de jambes", group: "abdos", unit: "rep" },
  { id: "gainage", name: "Gainage", group: "abdos", unit: "sec" },
] as const;

export function buildDefaultExercises(): Exercise[] {
  return EXERCISE_CATALOG.map((entry) => ({ ...entry, custom: false }));
}
