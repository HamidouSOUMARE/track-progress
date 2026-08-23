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
] as const;

const GROUPS_BY_ID = new Map(MUSCLE_GROUPS.map((group) => [group.id, group]));

export function getMuscleGroup(id: MuscleGroupId): MuscleGroup {
  const group = GROUPS_BY_ID.get(id);
  if (!group) {
    throw new Error(`Groupe musculaire inconnu : ${id}`);
  }
  return group;
}
