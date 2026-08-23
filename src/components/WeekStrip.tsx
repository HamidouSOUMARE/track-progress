"use client";

import { motion } from "motion/react";
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
            aria-label={`${day.label}${count > 0 ? ` — ${count} exercices` : " — repos"}`}
            onClick={() => onChange(day.id)}
            className={`relative flex flex-1 flex-col items-center gap-1.5 rounded-card border py-2.5 transition-colors ${
              selected
                ? "border-accent/50 bg-accent-soft"
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

            {day.id === today ? (
              <motion.span
                layoutId="today-marker"
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-pill bg-accent"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
