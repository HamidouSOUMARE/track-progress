import { STORAGE_VERSION, migrateSnapshot, type TrackerSnapshot } from "@/store/tracker-store";

const FILE_PREFIX = "track-progress";

/** Contenu exact d'un fichier de sauvegarde, tel qu'il sera écrit sur le disque. */
export function serializeSnapshot(snapshot: TrackerSnapshot, exportedAt = new Date()): string {
  return JSON.stringify(
    { version: STORAGE_VERSION, exportedAt: exportedAt.toISOString(), ...snapshot },
    null,
    2,
  );
}

export function downloadJson(content: string, suffix: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = `${FILE_PREFIX}-${suffix}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadSnapshot(snapshot: TrackerSnapshot): void {
  downloadJson(serializeSnapshot(snapshot), new Date().toISOString().slice(0, 10));
}

/**
 * Valide un fichier importé : on refuse plutôt que d'écraser des données avec du
 * bruit. Un fichier plus ancien passe par la même migration que les données
 * locales, sinon il réinjecterait des suivis incomplets.
 */
export function parseSnapshot(raw: string): TrackerSnapshot {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Le message brut du moteur JS n'aiderait personne.
    throw new Error("Fichier illisible : ce n'est pas du JSON valide");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Fichier illisible");
  }

  const { exercises, trackings, programs, activeProgramId, version } =
    parsed as Partial<TrackerSnapshot> & { version?: number };

  if (!Array.isArray(exercises) || typeof trackings !== "object" || trackings === null) {
    throw new Error("Format de sauvegarde inattendu");
  }

  return migrateSnapshot(
    {
      exercises,
      trackings,
      // Absents des fichiers antérieurs à la v3 : la migration s'en charge.
      programs: Array.isArray(programs) ? programs : [],
      activeProgramId: activeProgramId ?? null,
    },
    version ?? 1,
  );
}
