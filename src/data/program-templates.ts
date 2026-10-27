import type { WeekdayId } from "@/lib/types";

export type TemplateLevel = "debutant" | "intermediaire" | "confirme";
export type TemplatePlace = "salle" | "maison";
export type TemplateDays = 2 | 3 | 4 | 5;

/** Un exercice dans une séance type, avec la consigne qui va avec. */
export interface TemplateSlot {
  exerciseId: string;
  sets: number;
  /** Absent pour un exercice tenu dans le temps, comme le gainage. */
  reps?: readonly [number, number];
  rest: number;
}

export interface TemplateWorkout {
  /** Repère interne : une séance qui revient dans la semaine n'est créée qu'une fois. */
  key: string;
  name: string;
  slots: readonly TemplateSlot[];
}

export interface TemplateVariant {
  days: TemplateDays;
  /** Séances dans l'ordre de la semaine, posées sur les jours de `DAY_LAYOUTS`. */
  sessions: readonly TemplateWorkout[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  /** L'objectif en quelques mots, lu sur la carte. */
  goal: string;
  description: string;
  level: TemplateLevel;
  place: TemplatePlace;
  variants: readonly TemplateVariant[];
}

/**
 * Jours d'entraînement selon le rythme choisi : on laisse toujours au moins un
 * jour de repos entre deux séances quand c'est possible, et le week-end libre.
 */
export const DAY_LAYOUTS: Record<TemplateDays, readonly WeekdayId[]> = {
  2: ["lundi", "jeudi"],
  3: ["lundi", "mercredi", "vendredi"],
  4: ["lundi", "mardi", "jeudi", "vendredi"],
  5: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
};

export const LEVEL_LABELS: Record<TemplateLevel, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Confirmé",
};

export const PLACE_LABELS: Record<TemplatePlace, string> = {
  salle: "Salle",
  maison: "Maison",
};

function slot(
  exerciseId: string,
  sets: number,
  reps: readonly [number, number] | null,
  rest: number,
): TemplateSlot {
  return reps ? { exerciseId, sets, reps, rest } : { exerciseId, sets, rest };
}

function workout(key: string, name: string, slots: TemplateSlot[]): TemplateWorkout {
  return { key, name, slots };
}

/* --- Débuter ------------------------------------------------------------ */

const DEBUT_A = workout("debut-a", "Corps complet A", [
  slot("squat", 3, [8, 10], 120),
  slot("developpe-couche", 3, [8, 10], 120),
  slot("tirage-vertical", 3, [10, 12], 90),
  slot("developpe-halteres-assis", 3, [10, 12], 90),
  slot("gainage", 3, null, 60),
]);

const DEBUT_B = workout("debut-b", "Corps complet B", [
  slot("presse-a-cuisses", 3, [10, 12], 120),
  slot("developpe-incline", 3, [10, 12], 90),
  slot("rowing-haltere", 3, [10, 12], 90),
  slot("elevations-laterales", 3, [12, 15], 60),
  slot("releve-de-jambes", 3, [10, 15], 60),
]);

/* --- Corps complet ------------------------------------------------------ */

const FULL_A = workout("full-a", "Corps complet A", [
  slot("squat", 4, [6, 8], 150),
  slot("developpe-couche", 4, [6, 8], 150),
  slot("rowing-barre", 3, [8, 10], 120),
  slot("elevations-laterales", 3, [12, 15], 60),
  slot("curl-halteres", 3, [10, 12], 60),
]);

const FULL_B = workout("full-b", "Corps complet B", [
  slot("souleve-de-terre", 3, [5, 6], 180),
  slot("developpe-militaire", 3, [6, 8], 150),
  slot("tractions", 3, [6, 10], 120),
  slot("fentes", 3, [10, 12], 90),
  slot("extension-poulie", 3, [10, 12], 60),
]);

const FULL_C = workout("full-c", "Corps complet C", [
  slot("presse-a-cuisses", 3, [10, 12], 120),
  slot("developpe-incline", 3, [8, 10], 120),
  slot("tirage-horizontal", 3, [10, 12], 90),
  slot("leg-curl", 3, [10, 12], 75),
  slot("oiseau", 3, [12, 15], 60),
  slot("releve-de-jambes", 3, [10, 15], 60),
]);

/* --- Haut / Bas --------------------------------------------------------- */

const HAUT_A = workout("haut-a", "Haut du corps A", [
  slot("developpe-couche", 4, [6, 8], 150),
  slot("rowing-barre", 4, [6, 8], 150),
  slot("developpe-militaire", 3, [8, 10], 120),
  slot("tirage-vertical", 3, [8, 10], 90),
  slot("curl-barre", 3, [10, 12], 60),
  slot("extension-poulie", 3, [10, 12], 60),
]);

const BAS_A = workout("bas-a", "Bas du corps A", [
  slot("squat", 4, [6, 8], 180),
  slot("souleve-de-terre-roumain", 3, [8, 10], 120),
  slot("presse-a-cuisses", 3, [10, 12], 120),
  slot("leg-curl", 3, [10, 12], 75),
  slot("mollets", 4, [10, 15], 60),
  slot("gainage", 3, null, 60),
]);

const HAUT_B = workout("haut-b", "Haut du corps B", [
  slot("developpe-incline", 4, [8, 10], 120),
  slot("tractions", 4, [6, 10], 120),
  slot("developpe-halteres-assis", 3, [10, 12], 90),
  slot("tirage-horizontal", 3, [10, 12], 90),
  slot("elevations-laterales", 3, [12, 15], 60),
  slot("curl-marteau", 3, [10, 12], 60),
]);

const BAS_B = workout("bas-b", "Bas du corps B", [
  slot("souleve-de-terre", 3, [5, 5], 180),
  slot("squat-bulgare", 3, [8, 10], 90),
  slot("hip-thrust", 3, [8, 12], 90),
  slot("leg-extension", 3, [12, 15], 60),
  slot("mollets", 4, [10, 15], 60),
  slot("releve-de-jambes", 3, [10, 15], 60),
]);

/* --- Push Pull Legs ----------------------------------------------------- */

const PUSH = workout("push", "Push · Pousser", [
  slot("developpe-couche", 4, [6, 8], 150),
  slot("developpe-militaire", 3, [8, 10], 120),
  slot("developpe-incline", 3, [8, 12], 90),
  slot("elevations-laterales", 4, [12, 15], 60),
  slot("dips", 3, [8, 12], 90),
  slot("extension-poulie", 3, [10, 12], 60),
]);

const PULL = workout("pull", "Pull · Tirer", [
  slot("tractions", 4, [6, 10], 120),
  slot("rowing-barre", 4, [8, 10], 120),
  slot("tirage-horizontal", 3, [10, 12], 90),
  slot("face-pull", 3, [12, 15], 60),
  slot("curl-barre", 3, [8, 12], 60),
  slot("curl-marteau", 3, [10, 12], 60),
]);

const LEGS = workout("legs", "Legs · Jambes", [
  slot("squat", 4, [6, 8], 180),
  slot("souleve-de-terre-roumain", 3, [8, 10], 120),
  slot("presse-a-cuisses", 3, [10, 12], 120),
  slot("leg-curl", 3, [10, 12], 75),
  slot("mollets", 4, [10, 15], 60),
  slot("releve-de-jambes", 3, [10, 15], 60),
]);

/* --- Split par muscle --------------------------------------------------- */

const SPLIT_PECS = workout("split-pecs", "Pectoraux", [
  slot("developpe-couche", 4, [6, 8], 150),
  slot("developpe-incline", 4, [8, 10], 120),
  slot("developpe-halteres", 3, [10, 12], 90),
  slot("ecarte-poulie", 3, [12, 15], 60),
  slot("dips", 3, [8, 12], 90),
]);

const SPLIT_PECS_TRICEPS = workout("split-pecs-triceps", "Pectoraux & triceps", [
  slot("developpe-couche", 4, [6, 8], 150),
  slot("developpe-incline", 3, [8, 10], 120),
  slot("ecarte-poulie", 3, [12, 15], 60),
  slot("barre-au-front", 3, [8, 12], 75),
  slot("extension-poulie", 3, [10, 12], 60),
]);

const SPLIT_DOS = workout("split-dos", "Dos", [
  slot("tractions", 4, [6, 10], 120),
  slot("rowing-barre", 4, [8, 10], 120),
  slot("tirage-vertical", 3, [10, 12], 90),
  slot("rowing-haltere", 3, [10, 12], 90),
  slot("tirage-horizontal", 3, [12, 15], 75),
]);

const SPLIT_DOS_BICEPS = workout("split-dos-biceps", "Dos & biceps", [
  slot("tractions", 4, [6, 10], 120),
  slot("rowing-barre", 4, [8, 10], 120),
  slot("tirage-vertical", 3, [10, 12], 90),
  slot("curl-barre", 3, [8, 12], 60),
  slot("curl-marteau", 3, [10, 12], 60),
]);

const SPLIT_JAMBES = workout("split-jambes", "Jambes", [
  slot("squat", 4, [6, 8], 180),
  slot("presse-a-cuisses", 4, [10, 12], 120),
  slot("souleve-de-terre-roumain", 3, [8, 10], 120),
  slot("leg-extension", 3, [12, 15], 60),
  slot("leg-curl", 3, [10, 12], 75),
  slot("mollets", 4, [10, 15], 60),
]);

const SPLIT_EPAULES = workout("split-epaules", "Épaules & abdos", [
  slot("developpe-militaire", 4, [6, 8], 150),
  slot("elevations-laterales", 4, [12, 15], 60),
  slot("oiseau", 3, [12, 15], 60),
  slot("face-pull", 3, [12, 15], 60),
  slot("crunch-poulie", 3, [10, 15], 60),
  slot("gainage", 3, null, 60),
]);

const SPLIT_BRAS = workout("split-bras", "Bras", [
  slot("curl-barre", 4, [8, 10], 75),
  slot("barre-au-front", 4, [8, 10], 75),
  slot("curl-marteau", 3, [10, 12], 60),
  slot("extension-poulie", 3, [10, 12], 60),
  slot("curl-halteres", 3, [12, 15], 60),
]);

/* --- Haut du corps ------------------------------------------------------ */

const HAUT_COMPLET = workout("haut-complet", "Haut du corps complet", [
  slot("developpe-incline", 4, [8, 10], 120),
  slot("tractions", 4, [6, 10], 120),
  slot("developpe-halteres-assis", 3, [10, 12], 90),
  slot("rowing-haltere", 3, [10, 12], 90),
  slot("elevations-laterales", 3, [12, 15], 60),
  slot("curl-halteres", 3, [10, 12], 60),
  slot("extension-poulie", 3, [10, 12], 60),
]);

const BAS_ENTRETIEN = workout("bas-entretien", "Bas du corps", [
  slot("squat", 3, [8, 10], 150),
  slot("souleve-de-terre-roumain", 3, [8, 10], 120),
  slot("leg-curl", 3, [10, 12], 75),
  slot("mollets", 3, [12, 15], 60),
  slot("gainage", 3, null, 60),
]);

const BRAS_EPAULES = workout("bras-epaules", "Bras & épaules", [
  slot("elevations-laterales", 4, [12, 15], 60),
  slot("oiseau", 3, [12, 15], 60),
  slot("curl-barre", 3, [8, 12], 60),
  slot("barre-au-front", 3, [8, 12], 75),
  slot("curl-marteau", 3, [10, 12], 60),
  slot("extension-poulie", 3, [10, 12], 60),
]);

/* --- Force 5×5 ---------------------------------------------------------- */

const FORCE_A = workout("force-a", "Force A", [
  slot("squat", 5, [5, 5], 180),
  slot("developpe-couche", 5, [5, 5], 180),
  slot("rowing-barre", 5, [5, 5], 180),
]);

const FORCE_B = workout("force-b", "Force B", [
  slot("squat", 5, [5, 5], 180),
  slot("developpe-militaire", 5, [5, 5], 180),
  slot("souleve-de-terre", 1, [5, 5], 180),
]);

/* --- Fessiers & jambes -------------------------------------------------- */

const FESSIERS = workout("fessiers", "Fessiers", [
  slot("hip-thrust", 4, [8, 12], 120),
  slot("squat-bulgare", 3, [8, 12], 90),
  slot("abducteurs", 3, [15, 20], 60),
  slot("kickback-poulie", 3, [12, 15], 60),
]);

const ISCHIOS_FESSIERS = workout("ischios-fessiers", "Ischios & fessiers", [
  slot("souleve-de-terre-roumain", 4, [8, 10], 120),
  slot("hip-thrust", 3, [10, 12], 90),
  slot("leg-curl", 3, [10, 12], 75),
  slot("abducteurs", 3, [15, 20], 60),
]);

const QUADRICEPS = workout("quadriceps", "Quadriceps & fessiers", [
  slot("squat", 4, [6, 10], 150),
  slot("presse-a-cuisses", 3, [10, 12], 120),
  slot("fentes", 3, [10, 12], 90),
  slot("leg-extension", 3, [12, 15], 60),
  slot("mollets", 3, [12, 15], 60),
]);

const HAUT_LEGER = workout("haut-leger", "Haut du corps", [
  slot("developpe-halteres", 3, [10, 12], 90),
  slot("tirage-vertical", 3, [10, 12], 90),
  slot("tirage-horizontal", 3, [10, 12], 90),
  slot("developpe-halteres-assis", 3, [10, 12], 90),
  slot("elevations-laterales", 3, [12, 15], 60),
  slot("gainage", 3, null, 60),
]);

/* --- À la maison -------------------------------------------------------- */

const MAISON_A = workout("maison-a", "Maison A", [
  slot("pompes", 4, [8, 15], 60),
  slot("squat-poids-du-corps", 4, [15, 20], 60),
  slot("rowing-inverse", 3, [8, 12], 60),
  slot("pont-fessier", 3, [15, 20], 45),
  slot("gainage", 3, null, 45),
]);

const MAISON_B = workout("maison-b", "Maison B", [
  slot("pompes-piquees", 3, [6, 12], 60),
  slot("fentes-poids-du-corps", 3, [10, 15], 60),
  slot("superman", 3, [12, 15], 45),
  slot("dips-banc", 3, [8, 15], 60),
  slot("chaise", 3, null, 60),
  slot("gainage-lateral", 3, null, 45),
]);

/* --- Express 30 min ----------------------------------------------------- */

const EXPRESS_A = workout("express-a", "Express A", [
  slot("goblet-squat", 3, [10, 12], 60),
  slot("developpe-halteres", 3, [10, 12], 60),
  slot("rowing-haltere", 3, [10, 12], 60),
  slot("gainage", 2, null, 45),
]);

const EXPRESS_B = workout("express-b", "Express B", [
  slot("fentes", 3, [10, 12], 60),
  slot("developpe-halteres-assis", 3, [10, 12], 60),
  slot("tirage-vertical", 3, [10, 12], 60),
  slot("hip-thrust", 3, [10, 12], 60),
]);

const EXPRESS_C = workout("express-c", "Express C", [
  slot("presse-a-cuisses", 3, [10, 12], 60),
  slot("pompes", 3, [10, 15], 60),
  slot("tirage-horizontal", 3, [10, 12], 60),
  slot("releve-de-jambes", 2, [10, 15], 45),
]);

/**
 * Programmes tout prêts, chacun décliné selon le nombre de jours disponibles.
 * Une même séance peut revenir dans la semaine : c'est voulu, on progresse
 * mieux au début en répétant peu de mouvements.
 */
export const PROGRAM_TEMPLATES: readonly ProgramTemplate[] = [
  {
    id: "debuter",
    name: "Débuter",
    goal: "Apprendre les mouvements de base",
    description:
      "Peu d'exercices, tous essentiels, répétés chaque semaine pour prendre ses repères et voir les charges monter vite.",
    level: "debutant",
    place: "salle",
    variants: [
      { days: 2, sessions: [DEBUT_A, DEBUT_B] },
      { days: 3, sessions: [DEBUT_A, DEBUT_B, DEBUT_A] },
    ],
  },
  {
    id: "corps-complet",
    name: "Corps complet",
    goal: "Tout le corps à chaque séance",
    description:
      "Chaque séance travaille le haut et le bas du corps. Idéal quand on ne peut venir que deux ou trois fois par semaine.",
    level: "intermediaire",
    place: "salle",
    variants: [
      { days: 2, sessions: [FULL_A, FULL_B] },
      { days: 3, sessions: [FULL_A, FULL_B, FULL_C] },
    ],
  },
  {
    id: "haut-bas",
    name: "Haut / Bas",
    goal: "Le grand classique pour progresser",
    description:
      "On alterne haut et bas du corps : chaque muscle est travaillé deux fois par semaine en quatre séances.",
    level: "intermediaire",
    place: "salle",
    variants: [
      { days: 2, sessions: [HAUT_A, BAS_A] },
      { days: 4, sessions: [HAUT_A, BAS_A, HAUT_B, BAS_B] },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push Pull Legs",
    goal: "Pousser, tirer, jambes",
    description:
      "Les muscles sont regroupés par mouvement. En cinq jours, on y ajoute une séance haut et une séance bas pour tout revoir.",
    level: "intermediaire",
    place: "salle",
    variants: [
      { days: 3, sessions: [PUSH, PULL, LEGS] },
      { days: 5, sessions: [PUSH, PULL, LEGS, HAUT_B, BAS_B] },
    ],
  },
  {
    id: "split",
    name: "Split par muscle",
    goal: "Un groupe musculaire par séance",
    description:
      "Chaque séance se concentre sur une zone et l'épuise. Demande de la régularité : un muscle n'est vu qu'une fois par semaine.",
    level: "confirme",
    place: "salle",
    variants: [
      {
        days: 4,
        sessions: [SPLIT_PECS_TRICEPS, SPLIT_DOS_BICEPS, SPLIT_JAMBES, SPLIT_EPAULES],
      },
      {
        days: 5,
        sessions: [SPLIT_PECS, SPLIT_DOS, SPLIT_JAMBES, SPLIT_EPAULES, SPLIT_BRAS],
      },
    ],
  },
  {
    id: "force",
    name: "Force 5×5",
    goal: "Soulever plus lourd",
    description:
      "Trois mouvements lourds par séance, cinq séries de cinq, repos longs. On ajoute un peu de charge dès que les 5×5 passent.",
    level: "intermediaire",
    place: "salle",
    variants: [
      { days: 2, sessions: [FORCE_A, FORCE_B] },
      { days: 3, sessions: [FORCE_A, FORCE_B, FORCE_A] },
    ],
  },
  {
    id: "fessiers-jambes",
    name: "Fessiers & jambes",
    goal: "Accent sur le bas du corps",
    description:
      "Les fessiers reviennent à chaque séance de bas du corps, avec une séance de haut du corps pour garder l'équilibre.",
    level: "intermediaire",
    place: "salle",
    variants: [
      { days: 2, sessions: [FESSIERS, QUADRICEPS] },
      { days: 3, sessions: [FESSIERS, HAUT_LEGER, ISCHIOS_FESSIERS] },
      { days: 4, sessions: [FESSIERS, HAUT_LEGER, QUADRICEPS, ISCHIOS_FESSIERS] },
      {
        days: 5,
        sessions: [FESSIERS, QUADRICEPS, HAUT_LEGER, ISCHIOS_FESSIERS, FESSIERS],
      },
    ],
  },
  {
    id: "haut-du-corps",
    name: "Haut du corps",
    goal: "Pectoraux, dos, épaules et bras",
    description:
      "La priorité au haut du corps pour élargir la carrure, sans abandonner les jambes dès quatre séances.",
    level: "intermediaire",
    place: "salle",
    variants: [
      { days: 3, sessions: [PUSH, PULL, HAUT_COMPLET] },
      { days: 4, sessions: [PUSH, PULL, BAS_ENTRETIEN, HAUT_COMPLET] },
      { days: 5, sessions: [PUSH, PULL, BAS_ENTRETIEN, HAUT_COMPLET, BRAS_EPAULES] },
    ],
  },
  {
    id: "maison",
    name: "À la maison",
    goal: "Sans salle, au poids du corps",
    description:
      "Rien qu'un banc ou une chaise solide, et une table pour le rowing inversé. On progresse en ajoutant des répétitions.",
    level: "debutant",
    place: "maison",
    variants: [
      { days: 2, sessions: [MAISON_A, MAISON_B] },
      { days: 3, sessions: [MAISON_A, MAISON_B, MAISON_A] },
      { days: 4, sessions: [MAISON_A, MAISON_B, MAISON_A, MAISON_B] },
    ],
  },
  {
    id: "express",
    name: "Express 30 min",
    goal: "Pour les semaines chargées",
    description:
      "Quatre exercices, trois séries, une minute de repos : une séance complète qui tient dans une pause déjeuner.",
    level: "debutant",
    place: "salle",
    variants: [
      { days: 2, sessions: [EXPRESS_A, EXPRESS_B] },
      { days: 3, sessions: [EXPRESS_A, EXPRESS_B, EXPRESS_C] },
    ],
  },
];

export function findTemplate(id: string): ProgramTemplate | null {
  return PROGRAM_TEMPLATES.find((template) => template.id === id) ?? null;
}
