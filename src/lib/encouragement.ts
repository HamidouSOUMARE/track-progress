import type { Goal } from "@/lib/types";

export type CelebrationKind = "record" | "progress" | "steady";

/** Les messages de progression dépendent du sens visé : on monte, ou on descend. */
const MESSAGES: Record<CelebrationKind, Record<Goal, readonly string[]>> = {
  record: {
    up: [
      "Nouveau record !",
      "Tu viens de repousser ta limite",
      "Personne ne t'arrête",
      "Record explosé, bravo",
    ],
    down: [
      "Nouveau plus bas !",
      "Jamais descendu aussi bas",
      "Objectif grignoté, bravo",
      "Le cap est franchi",
    ],
  },
  progress: {
    up: ["Ça monte, continue", "Un cran au-dessus", "La régularité paie", "Encore un pas de plus"],
    down: [
      "Ça descend, continue",
      "Un centimètre de gagné",
      "La régularité paie",
      "Toujours dans la bonne direction",
    ],
  },
  steady: {
    up: ["Séance validée", "On garde le rythme", "Le volume compte aussi", "Bien joué, c'est noté"],
    down: ["Mesure enregistrée", "On garde le rythme", "C'est noté", "Le suivi continue"],
  },
};

export function pickMessage(kind: CelebrationKind, goal: Goal = "up"): string {
  const pool = MESSAGES[kind][goal];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

/** `gain` est déjà lu dans le sens de l'objectif : positif veut dire « ça progresse ». */
export function celebrationKind(gain: number, record: boolean): CelebrationKind {
  if (record) {
    return "record";
  }
  return gain > 0 ? "progress" : "steady";
}

/**
 * Message affiché pendant le repos. Il parle de la série qui arrive, pas de
 * celle qu'on vient de faire : c'est elle qu'il faut aller chercher.
 */
const REST_MESSAGES = {
  last: [
    "Dernière série, donne tout",
    "La der des ders",
    "Une dernière et c'est plié",
    "Tout ce qu'il te reste",
  ],
  half: [
    "Déjà à la moitié",
    "Plus de la moitié de faite",
    "Le plus dur est derrière",
    "Ça se creuse, continue",
  ],
  first: ["Bien lancé", "La première est dans la poche", "Le plus dur, c'était de commencer"],
  middle: ["On enchaîne", "Garde le rythme", "Ça avance", "Rien ne se perd, tout s'ajoute"],
} as const;

export function restEncouragement(setNumber: number, targetSets: number): string {
  const next = setNumber + 1;

  const pool =
    next >= targetSets
      ? REST_MESSAGES.last
      : setNumber * 2 >= targetSets
        ? REST_MESSAGES.half
        : setNumber === 1
          ? REST_MESSAGES.first
          : REST_MESSAGES.middle;

  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}
