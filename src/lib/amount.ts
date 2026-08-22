/**
 * Saisie d'une charge au clavier. Le champ garde exactement ce qui est tapé
 * (une chaîne, pas un nombre) : un `<input type="number">` piloté par un nombre
 * laisse traîner le zéro initial, « 0 » puis « 15 » restant affiché « 015 ».
 */
export function sanitizeAmount(input: string): string {
  const cleaned = input.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const [whole = "", ...decimals] = cleaned.split(",");
  const withoutLeadingZeros = whole.replace(/^0+(?=\d)/, "");

  if (decimals.length === 0) {
    return withoutLeadingZeros;
  }

  return `${withoutLeadingZeros || "0"},${decimals.join("").slice(0, 2)}`;
}

export function parseAmount(input: string): number {
  const parsed = Number(input.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Repasse d'un nombre à la saisie affichée, virgule comprise. */
export function toAmountInput(value: number): string {
  return String(value).replace(".", ",");
}
