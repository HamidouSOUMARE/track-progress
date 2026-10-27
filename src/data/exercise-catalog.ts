import type { Exercise } from "@/lib/types";

type CatalogEntry = Omit<Exercise, "custom" | "kind" | "goal">;

type MeasurementEntry = Omit<Exercise, "custom" | "kind" | "group">;

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

/**
 * Exercices que seuls les programmes tout prêts font entrer dans la
 * bibliothèque : on ne les impose pas d'office, la liste resterait chargée.
 */
export const PROGRAM_CATALOG: readonly CatalogEntry[] = [
  { id: "developpe-halteres", name: "Développé couché haltères", group: "pectoraux", unit: "kg" },
  { id: "pompes", name: "Pompes", group: "pectoraux", unit: "rep" },

  { id: "rowing-haltere", name: "Rowing haltère", group: "dos", unit: "kg" },
  { id: "tirage-horizontal", name: "Tirage horizontal", group: "dos", unit: "kg" },
  { id: "rowing-inverse", name: "Rowing inversé", group: "dos", unit: "rep" },
  { id: "superman", name: "Superman", group: "dos", unit: "rep" },

  { id: "souleve-de-terre-roumain", name: "Soulevé de terre roumain", group: "jambes", unit: "kg" },
  { id: "squat-bulgare", name: "Squat bulgare", group: "jambes", unit: "kg" },
  { id: "goblet-squat", name: "Goblet squat", group: "jambes", unit: "kg" },
  { id: "leg-extension", name: "Leg extension", group: "jambes", unit: "kg" },
  { id: "squat-poids-du-corps", name: "Squat au poids du corps", group: "jambes", unit: "rep" },
  { id: "fentes-poids-du-corps", name: "Fentes au poids du corps", group: "jambes", unit: "rep" },
  { id: "chaise", name: "Chaise", group: "jambes", unit: "sec" },

  { id: "hip-thrust", name: "Hip thrust", group: "fessiers", unit: "kg" },
  { id: "abducteurs", name: "Abducteurs à la machine", group: "fessiers", unit: "kg" },
  { id: "kickback-poulie", name: "Kickback à la poulie", group: "fessiers", unit: "kg" },
  { id: "pont-fessier", name: "Pont fessier", group: "fessiers", unit: "rep" },

  {
    id: "developpe-halteres-assis",
    name: "Développé haltères assis",
    group: "epaules",
    unit: "kg",
  },
  { id: "face-pull", name: "Face pull", group: "epaules", unit: "kg" },
  { id: "pompes-piquees", name: "Pompes piquées", group: "epaules", unit: "rep" },

  { id: "curl-marteau", name: "Curl marteau", group: "bras", unit: "kg" },
  { id: "dips-banc", name: "Dips sur banc", group: "bras", unit: "rep" },

  { id: "gainage-lateral", name: "Gainage latéral", group: "abdos", unit: "sec" },
] as const;

/** Une entrée du catalogue, quelle que soit la liste qui la porte. */
export function findCatalogEntry(id: string): CatalogEntry | null {
  return (
    EXERCISE_CATALOG.find((entry) => entry.id === id) ??
    PROGRAM_CATALOG.find((entry) => entry.id === id) ??
    null
  );
}

/**
 * Mesures prises sur le corps. Chacune porte le sens de son objectif : on gagne
 * des centimètres de bras, on en perd sur le tour de taille. L'utilisateur peut
 * inverser ce sens à tout moment depuis la fiche.
 */
export const MEASUREMENT_CATALOG: readonly MeasurementEntry[] = [
  { id: "poids-de-corps", name: "Poids de corps", unit: "kg", goal: "down" },
  { id: "tour-de-taille", name: "Tour de taille", unit: "cm", goal: "down" },
  { id: "tour-de-bras", name: "Tour de bras", unit: "cm", goal: "up" },
  { id: "tour-de-poitrine", name: "Tour de poitrine", unit: "cm", goal: "up" },
  { id: "tour-de-cuisse", name: "Tour de cuisse", unit: "cm", goal: "up" },
] as const;

export function buildDefaultExercises(): Exercise[] {
  return [
    ...EXERCISE_CATALOG.map<Exercise>((entry) => ({
      ...entry,
      kind: "charge",
      goal: "up",
      custom: false,
    })),
    ...MEASUREMENT_CATALOG.map<Exercise>((entry) => ({
      ...entry,
      group: "mensurations",
      kind: "mesure",
      custom: false,
    })),
  ];
}
