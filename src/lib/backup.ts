import { STORAGE_VERSION, migrateSnapshot, type TrackerSnapshot } from "@/store/tracker-store";

const FILE_PREFIX = "track-progress";

export function downloadSnapshot(snapshot: TrackerSnapshot): void {
  const payload = JSON.stringify(
    { version: STORAGE_VERSION, exportedAt: new Date().toISOString(), ...snapshot },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = `${FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Valide un fichier importé : on refuse plutôt que d'écraser des données avec du
 * bruit. Un fichier plus ancien passe par la même migration que les données
 * locales, sinon il réinjecterait des suivis incomplets.
 */
export function parseSnapshot(raw: string): TrackerSnapshot {
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Fichier illisible");
  }

  const { exercises, trackings, version } = parsed as Partial<TrackerSnapshot> & {
    version?: number;
  };

  if (!Array.isArray(exercises) || typeof trackings !== "object" || trackings === null) {
    throw new Error("Format de sauvegarde inattendu");
  }

  return migrateSnapshot({ exercises, trackings }, version ?? 1);
}
