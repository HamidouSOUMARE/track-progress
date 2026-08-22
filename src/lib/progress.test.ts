import { describe, expect, it } from "vitest";
import {
  computeProgress,
  countActiveDays,
  getIncrements,
  isRecord,
  summarize,
  toSeries,
} from "@/lib/progress";
import type { Exercise, LogEntry, Tracking } from "@/lib/types";

function entry(value: number, date: string): LogEntry {
  return { id: `${value}-${date}`, value, reps: null, sets: null, date };
}

function tracking(reference: number, entries: LogEntry[] = []): Tracking {
  return {
    exerciseId: "developpe-couche",
    reference,
    referenceDate: "2026-01-05T10:00:00.000Z",
    entries,
  };
}

describe("computeProgress", () => {
  it("retombe sur la référence tant qu'aucune performance n'est enregistrée", () => {
    const progress = computeProgress(tracking(60));

    expect(progress.current).toBe(60);
    expect(progress.best).toBe(60);
    expect(progress.delta).toBe(0);
    expect(progress.ratio).toBe(0);
    expect(progress.lastUpdate).toBeNull();
  });

  it("utilise la dernière entrée comme charge actuelle", () => {
    const progress = computeProgress(
      tracking(60, [entry(65, "2026-02-01T10:00:00.000Z"), entry(70, "2026-02-15T10:00:00.000Z")]),
    );

    expect(progress.current).toBe(70);
    expect(progress.delta).toBe(10);
    expect(progress.ratio).toBeCloseTo(0.1667, 3);
    expect(progress.entryCount).toBe(2);
    expect(progress.lastUpdate).toBe("2026-02-15T10:00:00.000Z");
  });

  it("garde le record même après une baisse de charge", () => {
    const progress = computeProgress(
      tracking(60, [entry(80, "2026-02-01T10:00:00.000Z"), entry(72, "2026-02-15T10:00:00.000Z")]),
    );

    expect(progress.best).toBe(80);
    expect(progress.current).toBe(72);
    expect(progress.delta).toBe(12);
  });

  it("évite une division par zéro quand la référence vaut 0", () => {
    expect(computeProgress(tracking(0, [entry(5, "2026-02-01T10:00:00.000Z")])).ratio).toBe(0);
  });
});

describe("isRecord", () => {
  const current = tracking(60, [entry(75, "2026-02-01T10:00:00.000Z")]);

  it("détecte un dépassement strict du meilleur résultat", () => {
    expect(isRecord(current, 77.5)).toBe(true);
  });

  it("ne compte pas une égalité comme un record", () => {
    expect(isRecord(current, 75)).toBe(false);
    expect(isRecord(current, 70)).toBe(false);
  });
});

describe("toSeries", () => {
  it("préfixe la série par la référence", () => {
    expect(toSeries(tracking(60, [entry(65, "2026-02-01T10:00:00.000Z")]))).toEqual([60, 65]);
  });

  it("renvoie deux points même sans historique pour rester traçable", () => {
    expect(toSeries(tracking(60))).toEqual([60, 60]);
  });
});

describe("summarize", () => {
  const exercises: Exercise[] = [
    { id: "squat", name: "Squat", group: "jambes", unit: "kg", custom: false },
    { id: "tractions", name: "Tractions", group: "dos", unit: "rep", custom: false },
  ];

  it("n'additionne que les kilos réellement gagnés", () => {
    const summary = summarize(exercises, [
      { ...tracking(100, [entry(110, "2026-02-01T10:00:00.000Z")]), exerciseId: "squat" },
      { ...tracking(8, [entry(12, "2026-02-01T10:00:00.000Z")]), exerciseId: "tractions" },
    ]);

    expect(summary.kilosGained).toBe(10);
    expect(summary.improvedCount).toBe(2);
    expect(summary.trackedCount).toBe(2);
  });

  it("ignore les régressions dans le total de kilos", () => {
    const summary = summarize(exercises, [
      { ...tracking(100, [entry(90, "2026-02-01T10:00:00.000Z")]), exerciseId: "squat" },
    ]);

    expect(summary.kilosGained).toBe(0);
    expect(summary.improvedCount).toBe(0);
  });

  it("retient la plus forte progression relative", () => {
    const summary = summarize(exercises, [
      { ...tracking(100, [entry(110, "2026-02-01T10:00:00.000Z")]), exerciseId: "squat" },
      { ...tracking(8, [entry(12, "2026-02-01T10:00:00.000Z")]), exerciseId: "tractions" },
    ]);

    expect(summary.bestRatioExerciseId).toBe("tractions");
    expect(summary.bestRatio).toBeCloseTo(0.5, 5);
  });
});

describe("countActiveDays", () => {
  const now = new Date("2026-03-01T12:00:00.000Z");

  it("compte une seule fois plusieurs séances du même jour", () => {
    const days = countActiveDays(
      [tracking(60, [entry(62, "2026-02-27T09:00:00.000Z"), entry(64, "2026-02-27T18:00:00.000Z")])],
      now,
    );

    expect(days).toBe(1);
  });

  it("écarte les entrées de plus de 30 jours", () => {
    const days = countActiveDays(
      [tracking(60, [entry(62, "2026-01-01T09:00:00.000Z"), entry(64, "2026-02-20T09:00:00.000Z")])],
      now,
    );

    expect(days).toBe(1);
  });
});

describe("getIncrements", () => {
  it("propose des paliers adaptés à l'unité", () => {
    expect(getIncrements("kg")).toEqual([1.25, 2.5, 5]);
    expect(getIncrements("rep")).toEqual([1, 2, 5]);
    expect(getIncrements("sec")).toEqual([5, 10, 15]);
  });
});
