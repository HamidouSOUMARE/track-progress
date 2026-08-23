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
