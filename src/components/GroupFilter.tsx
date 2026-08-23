"use client";

import { motion } from "motion/react";
import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import type { MuscleGroupId } from "@/lib/types";

export type GroupFilterValue = MuscleGroupId | "all";

interface GroupFilterProps {
  value: GroupFilterValue;
  counts: Record<MuscleGroupId, number>;
  total: number;
  onChange: (value: GroupFilterValue) => void;
}

export function GroupFilter({ value, counts, total, onChange }: GroupFilterProps) {
  type Option = { id: GroupFilterValue; label: string; count: number; accent: string };

  const options: Option[] = [
    { id: "all", label: "Tous", count: total, accent: "var(--color-accent)" } satisfies Option,
    ...MUSCLE_GROUPS.map<Option>((group) => ({
      id: group.id,
      label: group.label,
      count: counts[group.id] ?? 0,
      accent: `var(${group.accent})`,
    })),
    // Un groupe vide n'a rien à filtrer : il encombrerait la bande.
  ].filter((option) => option.id === "all" || option.count > 0);

  return (
    <div
      role="tablist"
      aria-label="Filtrer par groupe musculaire"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {options.map((option) => {
        const selected = option.id === value;

        return (
          <button
            key={option.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`relative flex shrink-0 items-center gap-2 rounded-pill border px-4 py-2 text-sm font-semibold transition-colors ${
              selected
                ? "border-transparent text-accent-ink"
                : "border-line bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId="group-filter-pill"
                className="absolute inset-0 rounded-pill"
                style={{ backgroundColor: option.accent }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
            <span className="relative tabular text-xs opacity-70">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
