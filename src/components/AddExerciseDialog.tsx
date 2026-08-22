"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import { useTrackerStore } from "@/store/tracker-store";
import type { MuscleGroupId, Unit } from "@/lib/types";

interface AddExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (exerciseId: string) => void;
}

const UNITS: { id: Unit; label: string }[] = [
  { id: "kg", label: "Charge (kg)" },
  { id: "rep", label: "Répétitions" },
  { id: "sec", label: "Temps (s)" },
];

export function AddExerciseDialog({ open, onClose, onCreated }: AddExerciseDialogProps) {
  const addExercise = useTrackerStore((state) => state.addExercise);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroupId>("pectoraux");
  const [unit, setUnit] = useState<Unit>("kg");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const exercise = addExercise({ name: trimmed, group, unit });
    setName("");
    onCreated(exercise.id);
  };

  return (
    <Sheet open={open} title="Ajouter un exercice" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-ink">Ajouter un exercice</h2>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          Nom de l&apos;exercice
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Rowing haltère"
            autoFocus
            className="rounded-card border border-line bg-surface-raised px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-ink-muted">Groupe musculaire</legend>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((option) => {
              const selected = option.id === group;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGroup(option.id)}
                  className={`rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-transparent text-accent-ink"
                      : "border-line bg-surface-raised text-ink-muted hover:text-ink"
                  }`}
                  style={selected ? { backgroundColor: `var(${option.accent})` } : undefined}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-ink-muted">Unité mesurée</legend>
          <div className="flex flex-wrap gap-2">
            {UNITS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === unit}
                onClick={() => setUnit(option.id)}
                className={`rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  option.id === unit
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-line bg-surface-raised text-ink-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-card border border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="flex-[2] rounded-card bg-accent py-3 text-sm font-bold text-accent-ink transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Créer l&apos;exercice
          </button>
        </div>
      </form>
    </Sheet>
  );
}
