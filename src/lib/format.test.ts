import { describe, expect, it } from "vitest";
import { formatDelta, formatRatio, formatRelativeDate, formatWithUnit } from "@/lib/format";

describe("formatWithUnit", () => {
  it("affiche l'unité de l'exercice", () => {
    expect(formatWithUnit(62.5, "kg")).toBe("62,5 kg");
    expect(formatWithUnit(12, "rep")).toBe("12 reps");
    expect(formatWithUnit(45, "sec")).toBe("45 s");
  });
});

describe("formatDelta", () => {
  it("préfixe la progression d'un signe explicite", () => {
    expect(formatDelta(2.5, "kg")).toBe("+2,5 kg");
    expect(formatDelta(-5, "kg")).toBe("−5 kg");
    expect(formatDelta(0, "kg")).toBe("0 kg");
  });
});

describe("formatRatio", () => {
  it("arrondit le pourcentage", () => {
    expect(formatRatio(0.1667)).toBe("+17 %");
    expect(formatRatio(-0.05)).toBe("−5 %");
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-03-01T12:00:00.000Z");

  it("exprime les mises à jour en langage courant", () => {
    expect(formatRelativeDate("2026-02-28T12:00:00.000Z", now)).toBe("hier");
    expect(formatRelativeDate("2026-03-01T11:00:00.000Z", now)).toBe("il y a 1 heure");
    expect(formatRelativeDate("2026-03-01T11:59:30.000Z", now)).toBe("à l'instant");
  });
});
