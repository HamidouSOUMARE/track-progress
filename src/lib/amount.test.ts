import { describe, expect, it } from "vitest";
import { parseAmount, sanitizeAmount, toAmountInput } from "@/lib/amount";

describe("sanitizeAmount", () => {
  it("supprime le zéro initial quand on tape par-dessus", () => {
    expect(sanitizeAmount("015")).toBe("15");
    expect(sanitizeAmount("0080")).toBe("80");
  });

  it("garde le zéro seul et les décimales inférieures à un", () => {
    expect(sanitizeAmount("0")).toBe("0");
    expect(sanitizeAmount("0,5")).toBe("0,5");
    expect(sanitizeAmount(",5")).toBe("0,5");
  });

  it("accepte le point comme virgule", () => {
    expect(sanitizeAmount("62.5")).toBe("62,5");
  });

  it("n'autorise qu'un séparateur et deux décimales", () => {
    expect(sanitizeAmount("12,3,4")).toBe("12,34");
    expect(sanitizeAmount("12,345")).toBe("12,34");
  });

  it("ignore les caractères non numériques", () => {
    expect(sanitizeAmount("60kg")).toBe("60");
    expect(sanitizeAmount("abc")).toBe("");
  });

  it("laisse vider le champ", () => {
    expect(sanitizeAmount("")).toBe("");
  });
});

describe("parseAmount", () => {
  it("interprète la virgule décimale", () => {
    expect(parseAmount("62,5")).toBe(62.5);
  });

  it("traite une saisie vide comme zéro", () => {
    expect(parseAmount("")).toBe(0);
  });
});

describe("toAmountInput", () => {
  it("réaffiche un nombre avec la virgule", () => {
    expect(toAmountInput(62.5)).toBe("62,5");
    expect(toAmountInput(80)).toBe("80");
  });
});
