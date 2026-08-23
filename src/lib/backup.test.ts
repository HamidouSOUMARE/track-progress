import { describe, expect, it } from "vitest";
import { parseSnapshot } from "@/lib/backup";

const v1File = JSON.stringify({
  version: 1,
  exportedAt: "2026-08-01T10:00:00.000Z",
  exercises: [{ id: "squat", name: "Squat", group: "jambes", unit: "kg", custom: false }],
  trackings: {
    squat: {
      exerciseId: "squat",
      reference: 100,
      referenceDate: "2026-02-01T10:00:00.000Z",
      entries: [],
    },
  },
});

describe("parseSnapshot", () => {
  it("refuse un fichier qui n'est pas une sauvegarde", () => {
    expect(() => parseSnapshot("[]")).toThrow(/format/i);
    expect(() => parseSnapshot('{"exercises":[]}')).toThrow(/format/i);
  });

  it("refuse un contenu illisible", () => {
    expect(() => parseSnapshot('"texte"')).toThrow(/illisible/i);
  });

  it("migre un fichier exporté avant les mensurations", () => {
    const snapshot = parseSnapshot(v1File);
    const squat = snapshot.exercises.find((exercise) => exercise.id === "squat");

    expect(squat?.kind).toBe("charge");
    expect(squat?.goal).toBe("up");
    expect(snapshot.exercises.some((exercise) => exercise.kind === "mesure")).toBe(true);
  });

  it("préserve l'historique du fichier importé", () => {
    expect(parseSnapshot(v1File).trackings.squat?.reference).toBe(100);
  });
});
