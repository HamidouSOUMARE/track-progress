export type ReleaseNoteKind = "nouveau" | "ameliore";

export interface ReleaseNote {
  kind: ReleaseNoteKind;
  title: string;
  description: string;
}

export interface Release {
  /** Repère de version, comparé à la dernière version vue. */
  id: string;
  /** Jour de mise en ligne, au format ISO. */
  date: string;
  notes: readonly ReleaseNote[];
}

/**
 * Nouveautés annoncées à l'ouverture, de la plus récente à la plus ancienne.
 * Écrites pour l'utilisateur, pas recopiées des commits : trois ou quatre
 * points par version, ce qui change pour lui et où le trouver.
 */
export const RELEASES: readonly Release[] = [
  {
    id: "2026-10-27",
    date: "2026-10-27",
    notes: [
      {
        kind: "nouveau",
        title: "Programmes tout prêts",
        description:
          "Dix programmes, de Débuter au Split par muscle, de 2 à 5 jours par semaine, posés sur les jours de ton choix. À retrouver dans Mes programmes.",
      },
      {
        kind: "nouveau",
        title: "Échauffement minuté",
        description:
          "Avant la séance ou avant un exercice, un minuteur qui ne compte pas dans ta séance.",
      },
      {
        kind: "ameliore",
        title: "Repos sur mesure",
        description:
          "Choisis ta propre durée de repos dans la fiche d'un exercice, à la seconde près.",
      },
      {
        kind: "nouveau",
        title: "Groupe Fessiers",
        description: "Les fessiers ont désormais leur propre filtre dans tes suivis.",
      },
    ],
  },
];

/** Au-delà, on résume : personne ne lit six mois de nouveautés d'un coup. */
const MAX_ANNOUNCED = 3;

/**
 * Versions à annoncer. Sans repère, seul quelqu'un qui a déjà un historique
 * découvre la dernière version : un nouvel utilisateur n'a rien à redécouvrir.
 */
export function unseenReleases(
  releases: readonly Release[],
  lastSeen: string | null,
  hasHistory: boolean,
): Release[] {
  if (lastSeen === null) {
    return hasHistory ? releases.slice(0, 1) : [];
  }

  const index = releases.findIndex((release) => release.id === lastSeen);
  // Repère inconnu, d'une version retirée par exemple : on montre la dernière.
  const count = index === -1 ? 1 : index;
  return releases.slice(0, Math.min(count, MAX_ANNOUNCED));
}
