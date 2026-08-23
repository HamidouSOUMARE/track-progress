import { emptyWeek } from "@/data/weekdays";
import { serializeSnapshot } from "@/lib/backup";
import type { TrackerSnapshot } from "@/store/tracker-store";

/**
 * Sauvegarde d'exemple, construite avec les types de l'app : elle ne peut pas
 * décrire un format périmé. Les identifiants sont préfixés pour qu'un import
 * accidentel n'aille pas greffer un faux historique sur de vrais exercices.
 */
export function buildSampleSnapshot(): TrackerSnapshot {
  const days = emptyWeek();
  days.lundi = ["exemple-developpe-couche", "exemple-tractions"];
  days.jeudi = ["exemple-developpe-couche"];

  return {
    exercises: [
      {
        id: "exemple-developpe-couche",
        name: "Développé couché (exemple)",
        group: "pectoraux",
        unit: "kg",
        kind: "charge",
        goal: "up",
        note: "Banc au cran 3, barre au niveau des pectoraux.",
        custom: true,
      },
      {
        id: "exemple-tractions",
        name: "Tractions (exemple)",
        group: "dos",
        unit: "rep",
        kind: "charge",
        goal: "up",
        custom: true,
      },
      {
        id: "exemple-tour-de-taille",
        name: "Tour de taille (exemple)",
        group: "mensurations",
        unit: "cm",
        kind: "mesure",
        goal: "down",
        custom: true,
      },
    ],
    trackings: {
      "exemple-developpe-couche": {
        exerciseId: "exemple-developpe-couche",
        reference: 60,
        referenceDate: "2026-06-01T09:00:00.000Z",
        entries: [
          {
            id: "exemple-entree-1",
            value: 62.5,
            reps: 8,
            sets: 4,
            date: "2026-06-15T09:00:00.000Z",
          },
          {
            id: "exemple-entree-2",
            value: 65,
            reps: 6,
            sets: 4,
            date: "2026-07-02T09:00:00.000Z",
          },
        ],
      },
      "exemple-tour-de-taille": {
        exerciseId: "exemple-tour-de-taille",
        reference: 85,
        referenceDate: "2026-06-01T09:00:00.000Z",
        entries: [
          { id: "exemple-entree-3", value: 83.5, reps: null, sets: null, date: "2026-07-01T09:00:00.000Z" },
        ],
      },
    },
    programs: [{ id: "exemple-programme", name: "Haut du corps (exemple)", days }],
    activeProgramId: "exemple-programme",
  };
}

export function sampleJson(): string {
  return serializeSnapshot(buildSampleSnapshot(), new Date("2026-07-02T09:00:00.000Z"));
}
