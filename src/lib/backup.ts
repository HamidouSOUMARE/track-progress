import type { TrackerSnapshot } from "@/store/tracker-store";

const FILE_PREFIX = "track-progress";

export function downloadSnapshot(snapshot: TrackerSnapshot): void {
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...snapshot }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = `${FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Valide un fichier importé : on refuse plutôt que d'écraser des données avec du bruit. */
export function parseSnapshot(raw: string): TrackerSnapshot {
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Fichier illisible");
  }

  const { exercises, trackings } = parsed as Partial<TrackerSnapshot>;

  if (!Array.isArray(exercises) || typeof trackings !== "object" || trackings === null) {
    throw new Error("Format de sauvegarde inattendu");
  }

  return { exercises, trackings };
}
