"use client";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import type { Summary } from "@/lib/progress";

interface StatsBannerProps {
  summary: Summary;
}

interface Tile {
  label: string;
  value: number;
  suffix: string;
  hint: string;
  highlight?: boolean;
}

export function StatsBanner({ summary }: StatsBannerProps) {
  const tiles: Tile[] = [
    {
      label: "Kilos gagnés",
      value: summary.kilosGained,
      suffix: "kg",
      hint: "depuis tes références",
      highlight: true,
    },
    {
      label: "En progression",
      value: summary.improvedCount,
      suffix: `/ ${summary.trackedCount}`,
      hint: "exercices suivis",
    },
    {
      // Un compteur qui ne recule jamais, vacances ou pas.
      label: "Records battus",
      value: summary.records,
      suffix: summary.records > 1 ? "records" : "record",
      hint: "depuis le début",
    },
  ];

  return (
    <section
      aria-label="Vue d'ensemble de ta progression"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`flex flex-col gap-1 rounded-card border p-4 ${
            tile.highlight
              ? "border-accent/25 bg-accent-soft"
              : "border-line bg-surface"
          } ${tile.label === "Records battus" ? "col-span-2 sm:col-span-1" : ""}`}
        >
          <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {tile.label}
          </span>
          <p className="flex items-baseline gap-1">
            <AnimatedNumber
              value={tile.value}
              className={`tabular text-3xl leading-none font-black ${
                tile.highlight ? "text-accent" : "text-ink"
              }`}
            />
            <span className="text-sm font-semibold text-ink-muted">{tile.suffix}</span>
          </p>
          <span className="text-xs text-ink-faint">{tile.hint}</span>
        </div>
      ))}
    </section>
  );
}
