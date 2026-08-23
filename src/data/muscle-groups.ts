import type { MuscleGroup, MuscleGroupId } from "@/lib/types";

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  {
    id: "pectoraux",
    label: "Pectoraux",
    shortLabel: "Pecs",
    accent: "--color-group-pectoraux",
  },
  { id: "dos", label: "Dos", shortLabel: "Dos", accent: "--color-group-dos" },
  {
    id: "jambes",
    label: "Jambes",
    shortLabel: "Jambes",
    accent: "--color-group-jambes",
  },
  {
    id: "epaules",
    label: "Épaules",
    shortLabel: "Épaules",
    accent: "--color-group-epaules",
  },
  { id: "bras", label: "Bras", shortLabel: "Bras", accent: "--color-group-bras" },
  { id: "abdos", label: "Abdos", shortLabel: "Abdos", accent: "--color-group-abdos" },
  {
    id: "mensurations",
    label: "Mensurations",
    shortLabel: "Mesures",
    accent: "--color-group-mensurations",
  },
  // Refuge des groupes qu'on ne sait pas rattacher : mieux vaut visible que perdu.
  { id: "autres", label: "Autres", shortLabel: "Autres", accent: "--color-group-autres" },
] as const;

const GROUPS_BY_ID = new Map(MUSCLE_GROUPS.map((group) => [group.id, group]));

const FALLBACK_GROUP = GROUPS_BY_ID.get("autres")!;

/**
 * Ne lève jamais : un groupe inconnu venu d'un fichier importé ne doit pas
 * faire tomber le rendu, sinon l'app devient inutilisable au chargement suivant.
 */
export function getMuscleGroup(id: MuscleGroupId): MuscleGroup {
  return GROUPS_BY_ID.get(id) ?? FALLBACK_GROUP;
}

export function isKnownGroup(id: string): id is MuscleGroupId {
  return GROUPS_BY_ID.has(id as MuscleGroupId);
}
