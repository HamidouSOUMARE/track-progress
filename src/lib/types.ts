export type MuscleGroupId =
  | "pectoraux"
  | "dos"
  | "jambes"
  | "epaules"
  | "bras"
  | "abdos";

/** Unité de mesure de la performance : charge, répétitions ou temps. */
export type Unit = "kg" | "rep" | "sec";

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
  /** Exercice ajouté par l'utilisateur, donc supprimable. */
  custom: boolean;
}

export interface LogEntry {
  id: string;
  /** Charge (kg), répétitions ou secondes selon l'unité de l'exercice. */
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
  best: number;
  /** Écart absolu entre la charge actuelle et la référence. */
  delta: number;
  /** Écart relatif (0.15 = +15 %). */
  ratio: number;
  entryCount: number;
  lastUpdate: string | null;
}
