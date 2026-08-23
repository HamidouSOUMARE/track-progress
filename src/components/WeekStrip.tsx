"use client";

import { WEEKDAYS } from "@/data/weekdays";
import type { WeekdayId } from "@/lib/types";

interface WeekStripProps {
  value: WeekdayId;
  today: WeekdayId;
  /** Nombre d'exercices programmés par jour, pour signaler les jours pleins. */
  counts: Record<WeekdayId, number>;
  onChange: (day: WeekdayId) => void;
}

export function WeekStrip({ value, today, counts, onChange }: WeekStripProps) {
  return (
    <div role="tablist" aria-label="Jour de la semaine" className="flex gap-1.5">
      {WEEKDAYS.map((day) => {
        const selected = day.id === value;
        const count = counts[day.id];

        return (
          <button
            key={day.id}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-label={`${day.label}${day.id === today ? " (aujourd'hui)" : ""}${
              count > 0 ? ` — ${count} exercices` : " — repos"
            }`}
            onClick={() => onChange(day.id)}
            className={`relative flex flex-1 flex-col items-center gap-1.5 rounded-card border py-2.5 transition-colors ${
              selected
                ? "border-accent bg-accent-soft"
                : day.id === today
                  ? // Contour discret : le jour courant reste repérable même ailleurs dans la semaine.
                    "border-accent/40 bg-surface"
                  : "border-line bg-surface hover:border-ink-faint/40"
            }`}
          >
            <span
              className={`text-sm font-bold ${
                selected ? "text-accent" : day.id === today ? "text-ink" : "text-ink-muted"
              }`}
            >
              {day.letter}
            </span>

            <span
              aria-hidden="true"
              className={`size-1.5 rounded-pill transition-colors ${
                count > 0 ? (selected ? "bg-accent" : "bg-ink-faint") : "bg-transparent"
              }`}
            />

          </button>
        );
      })}
    </div>
  );
}
