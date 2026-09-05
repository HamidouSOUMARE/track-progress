import type { Weekday, WeekdayId } from "@/lib/types";

export const WEEKDAYS: readonly Weekday[] = [
  { id: "lundi", label: "Lundi", letter: "L" },
  { id: "mardi", label: "Mardi", letter: "M" },
  { id: "mercredi", label: "Mercredi", letter: "M" },
  { id: "jeudi", label: "Jeudi", letter: "J" },
  { id: "vendredi", label: "Vendredi", letter: "V" },
  { id: "samedi", label: "Samedi", letter: "S" },
  { id: "dimanche", label: "Dimanche", letter: "D" },
] as const;

/** `getDay()` place dimanche en tête : on décale pour une semaine qui commence le lundi. */
export function todayWeekday(now = new Date()): WeekdayId {
  const index = (now.getDay() + 6) % 7;
  return WEEKDAYS[index]!.id;
}

/** Repère de journée locale, sans passer par UTC qui décalerait la nuit. */
export function localStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function todayStamp(now = new Date()): string {
  return localStamp(now);
}

/**
 * Le jour consulté survit à un rafraîchissement, mais pas au changement de date :
 * ouvrir l'app le lendemain doit montrer la séance du jour, pas celle de la veille.
 */
export function resolveSelectedDay(
  stored: { day: WeekdayId; date: string } | null | undefined,
  now = new Date(),
): WeekdayId {
  return stored && stored.date === todayStamp(now) ? stored.day : todayWeekday(now);
}

export function emptyWeek(): Record<WeekdayId, string[]> {
  return WEEKDAYS.reduce(
    (week, day) => ({ ...week, [day.id]: [] }),
    {} as Record<WeekdayId, string[]>,
  );
}
