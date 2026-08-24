"use client";

import { Reorder, useDragControls } from "motion/react";
import type { Exercise } from "@/lib/types";

interface PlannedExerciseRowProps {
  exercise: Exercise;
  position: number;
  total: number;
  dayLabel: string;
  onMove: (offset: number) => void;
  onRemove: () => void;
}

export function PlannedExerciseRow({
  exercise,
  position,
  total,
  dayLabel,
  onMove,
  onRemove,
}: PlannedExerciseRowProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={exercise}
      // Seule la poignée déclenche le glissement : ailleurs, le doigt fait
      // défiler la page comme il s'y attend.
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-card border border-line bg-surface px-2 py-2.5"
      whileDrag={{ scale: 1.02, borderColor: "var(--color-accent)", zIndex: 1 }}
    >
      <span
        role="presentation"
        onPointerDown={(event) => controls.start(event)}
        style={{ touchAction: "none" }}
        title="Glisser pour déplacer"
        className="flex size-8 shrink-0 cursor-grab items-center justify-center text-ink-faint transition-colors select-none hover:text-ink active:cursor-grabbing"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="4" r="1.2" />
          <circle cx="10" cy="4" r="1.2" />
          <circle cx="6" cy="8" r="1.2" />
          <circle cx="10" cy="8" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
          <circle cx="10" cy="12" r="1.2" />
        </svg>
      </span>

      <span className="tabular w-4 shrink-0 text-xs font-bold text-ink-faint">{position}</span>

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
        {exercise.name}
        {exercise.archived ? (
          <span className="ml-2 text-xs font-normal text-ink-faint">masqué</span>
        ) : null}
      </span>

      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={position === 1}
        aria-label={`Monter ${exercise.name}`}
        className="flex size-8 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30"
      >
        <span aria-hidden="true">↑</span>
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={position === total}
        aria-label={`Descendre ${exercise.name}`}
        className="flex size-8 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30"
      >
        <span aria-hidden="true">↓</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${exercise.name} du ${dayLabel.toLowerCase()}`}
        className="flex size-8 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
      >
        <span aria-hidden="true">×</span>
      </button>
    </Reorder.Item>
  );
}
