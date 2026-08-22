export type CelebrationKind = "record" | "progress" | "steady";

const MESSAGES: Record<CelebrationKind, readonly string[]> = {
  record: [
    "Nouveau record !",
    "Tu viens de repousser ta limite",
    "Personne ne t'arrête",
    "Record explosé, bravo",
  ],
  progress: [
    "Ça monte, continue",
    "Un cran au-dessus",
    "La régularité paie",
    "Encore un pas de plus",
  ],
  steady: [
    "Séance validée",
    "On garde le rythme",
    "Le volume compte aussi",
    "Bien joué, c'est noté",
  ],
};

export function pickMessage(kind: CelebrationKind): string {
  const pool = MESSAGES[kind];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

export function celebrationKind(delta: number, record: boolean): CelebrationKind {
  if (record) {
    return "record";
  }
  return delta > 0 ? "progress" : "steady";
}
