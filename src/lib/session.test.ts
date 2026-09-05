import { describe, expect, it } from "vitest";
import {
  countDone,
  formatCountdown,
  isDoneOn,
  lastPerformance,
  nextInSession,
  restSeconds,
} from "@/lib/session";
import type { Exercise, LogEntry, Tracking } from "@/lib/types";

function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    group: "jambes",
    unit: "kg",
    kind: "charge",
    goal: "up",
    custom: false,
    ...overrides,
  };
}

function entry(value: number, date: string): LogEntry {
  return { id: `${value}-${date}`, value, reps: 8, sets: 4, date };
}

function tracking(entries: LogEntry[]): Tracking {
  return { exerciseId: "x", reference: 60, referenceDate: "2026-01-01T09:00:00", entries };
}

const monday = new Date("2026-09-07T18:00:00");

describe("restSeconds", () => {
  it("applique un repos par défaut sans réglage", () => {
    expect(restSeconds(exercise("squat"))).toBe(90);
  });

  it("respecte le repos choisi, zéro compris", () => {
    expect(restSeconds(exercise("squat", { rest: 180 }))).toBe(180);
    expect(restSeconds(exercise("squat", { rest: 0 }))).toBe(0);
  });

  it("ne lance pas de repos pour une mensuration", () => {
    expect(restSeconds(exercise("taille", { kind: "mesure", rest: 120 }))).toBe(0);
  });
});

describe("isDoneOn", () => {
  it("reconnaît une performance du jour", () => {
    expect(isDoneOn(tracking([entry(100, "2026-09-07T17:00:00")]), monday)).toBe(true);
  });

  it("ignore une performance d'un autre jour", () => {
    expect(isDoneOn(tracking([entry(100, "2026-09-06T17:00:00")]), monday)).toBe(false);
  });

  it("considère un exercice sans suivi comme à faire", () => {
    expect(isDoneOn(undefined, monday)).toBe(false);
  });
});

describe("countDone", () => {
  it("compte les exercices déjà enregistrés du jour", () => {
    const done = countDone(
      [exercise("a"), exercise("b"), exercise("c")],
      {
        a: tracking([entry(100, "2026-09-07T17:00:00")]),
        b: tracking([entry(50, "2026-09-01T17:00:00")]),
      },
      monday,
    );

    expect(done).toBe(1);
  });
});

describe("lastPerformance", () => {
  it("rend la dernière entrée enregistrée", () => {
    const last = lastPerformance(
      tracking([entry(60, "2026-09-01T17:00:00"), entry(65, "2026-09-04T17:00:00")]),
    );

    expect(last?.value).toBe(65);
  });

  it("rend null quand rien n'a été enregistré", () => {
    expect(lastPerformance(tracking([]))).toBeNull();
    expect(lastPerformance(undefined)).toBeNull();
  });
});

describe("nextInSession", () => {
  const exercises = [exercise("a"), exercise("b"), exercise("c"), exercise("d")];
  const planned = ["a", "b", "c", "d"];

  it("propose le premier exercice restant après celui qu'on vient de faire", () => {
    const next = nextInSession(planned, exercises, {}, "a", monday);

    expect(next?.id).toBe("b");
  });

  it("saute ceux déjà faits aujourd'hui", () => {
    const next = nextInSession(
      planned,
      exercises,
      { b: tracking([entry(50, "2026-09-07T17:00:00")]) },
      "a",
      monday,
    );

    expect(next?.id).toBe("c");
  });

  it("saute les exercices masqués", () => {
    const next = nextInSession(
      planned,
      [exercise("a"), exercise("b", { archived: true }), exercise("c"), exercise("d")],
      {},
      "a",
      monday,
    );

    expect(next?.id).toBe("c");
  });

  it("ne propose rien après le dernier exercice", () => {
    expect(nextInSession(planned, exercises, {}, "d", monday)).toBeNull();
  });

  it("ne propose rien pour un exercice hors de la séance", () => {
    expect(nextInSession(planned, exercises, {}, "hors-programme", monday)).toBeNull();
  });
});

describe("formatCountdown", () => {
  it("affiche un décompte lisible", () => {
    expect(formatCountdown(180)).toBe("3:00");
    expect(formatCountdown(95)).toBe("1:35");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
