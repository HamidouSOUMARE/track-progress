export type MuscleGroupId =
  | "pectoraux"
  | "dos"
  | "jambes"
  | "epaules"
  | "bras"
  | "abdos"
  | "mensurations"
  | "autres";

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
  /** Masqué des listes, mais l'historique est conservé. */
  archived?: boolean;
  /** Repos en secondes entre deux séries. 0 pour aucun minuteur. */
  rest?: number;
  /** Nombre de séries visées pour cet exercice. */
  targetSets?: number;
  /** Fourchette de répétitions visée, affichée pendant la saisie. */
  targetRepsMin?: number;
  targetRepsMax?: number;
  /** Ajouté par l'utilisateur plutôt que repris du catalogue. */
  custom: boolean;
}

/** Une série : la charge portée et les répétitions tenues. */
export interface SetLog {
  value: number;
  reps: number;
}

export interface LogEntry {
  id: string;
  /**
   * Charge la plus lourde de la séance — c'est elle qui porte la progression.
   * Le tonnage se déduit des séries, il ne remplace pas cette valeur.
   */
  value: number;
  /** Saisie rapide, sans détail par série. */
  reps: number | null;
  sets: number | null;
  /** Détail série par série, quand la séance a été menée pas à pas. */
  series?: SetLog[];
  /** Faux tant que les séries de l'exercice ne sont pas terminées. */
  done?: boolean;
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

export type WeekdayId =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

export interface Weekday {
  id: WeekdayId;
  label: string;
  /** Initiale affichée dans la bande de la semaine. */
  letter: string;
}

export interface Program {
  id: string;
  name: string;
  /** Exercices de chaque jour, dans l'ordre où on les enchaîne. */
  days: Record<WeekdayId, string[]>;
}
