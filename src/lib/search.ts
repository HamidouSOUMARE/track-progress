/** Comparaison insensible à la casse et aux accents, pour les champs de recherche. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
