export type MuscleGroupId =
  | "pectoraux"
  | "dos"
  | "jambes"
  | "epaules"
  | "bras"
  | "abdos"
  | "mensurations";

/** Unité mesurée : charge, répétitions, temps ou centimètres. */
export type Unit = "kg" | "rep" | "sec" | "cm";

/** Une charge soulevée, ou une mesure prise sur le corps. */
export type TrackKind = "charge" | "mesure";

/**
 * Sens dans lequel va le progrès. Une charge monte toujours, une mensuration
 * dépend de l'objectif : un tour de bras qu'on gagne, un tour de taille qu'on perd.
 */
export type Goal = "up" | "down";

export interface MuscleGroup {
  id: MuscleGroupId;
  label: string;
  /** Libellé court utilisé sur les filtres mobiles. */
  shortLabel: string;
  /** Nom du token de couleur associé (voir globals.css). */
  accent: string;
}

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroupId;
  unit: Unit;
  kind: TrackKind;
  goal: Goal;
  /** Réglages de la machine, consignes de technique… saisis librement. */
  note?: string;
  /** Ajouté par l'utilisateur plutôt que repris du catalogue. */
  custom: boolean;
}

export interface LogEntry {
  id: string;
  /** Charge, répétitions, secondes ou centimètres selon l'unité. */
  value: number;
  reps: number | null;
  sets: number | null;
  date: string;
}

export interface Tracking {
  exerciseId: string;
  /** Point de départ, sert de base au calcul de progression. */
  reference: number;
  referenceDate: string;
  entries: LogEntry[];
}

export interface Progress {
  reference: number;
  current: number;
  /** Meilleure valeur atteinte, dans le sens de l'objectif. */
  best: number;
  /** Écart brut entre la valeur actuelle et la référence, signe compris. */
  delta: number;
  /** Écart lu dans le sens de l'objectif : positif = ça progresse. */
  gain: number;
  /** Écart relatif dans le sens de l'objectif (0.15 = +15 %). */
  ratio: number;
  entryCount: number;
  lastUpdate: string | null;
}
