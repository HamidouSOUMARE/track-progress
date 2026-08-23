"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import { useTrackerStore } from "@/store/tracker-store";
import type { Goal, MuscleGroupId, TrackKind, Unit } from "@/lib/types";

interface AddExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (exerciseId: string) => void;
}

const KINDS: { id: TrackKind; label: string; hint: string }[] = [
  { id: "charge", label: "Exercice", hint: "une charge à faire monter" },
  { id: "mesure", label: "Mensuration", hint: "une mesure prise sur le corps" },
];

const UNITS: Record<TrackKind, { id: Unit; label: string }[]> = {
  charge: [
    { id: "kg", label: "Charge (kg)" },
    { id: "rep", label: "Répétitions" },
    { id: "sec", label: "Temps (s)" },
  ],
  mesure: [
    { id: "cm", label: "Centimètres" },
    { id: "kg", label: "Kilos" },
  ],
};

const GOALS: { id: Goal; label: string }[] = [
  { id: "up", label: "↑ Augmenter" },
  { id: "down", label: "↓ Réduire" },
];

const TRAINING_GROUPS = MUSCLE_GROUPS.filter((group) => group.id !== "mensurations");

export function AddExerciseDialog({ open, onClose, onCreated }: AddExerciseDialogProps) {
  const addExercise = useTrackerStore((state) => state.addExercise);
  const [kind, setKind] = useState<TrackKind>("charge");
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroupId>("pectoraux");
  const [unit, setUnit] = useState<Unit>("kg");
  const [goal, setGoal] = useState<Goal>("up");

  const isMeasure = kind === "mesure";

  const switchKind = (next: TrackKind) => {
    setKind(next);
    // Les unités ne se recouvrent pas d'un type à l'autre : on repart du défaut.
    setUnit(next === "mesure" ? "cm" : "kg");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const exercise = addExercise({
      name: trimmed,
      group: isMeasure ? "mensurations" : group,
      unit,
      kind,
      goal: isMeasure ? goal : "up",
    });

    setName("");
    onCreated(exercise.id);
  };

  return (
    <Sheet open={open} title="Ajouter un suivi" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-ink">Ajouter un suivi</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-ink-muted">Type de suivi</legend>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === kind}
                onClick={() => switchKind(option.id)}
                className={`flex flex-col gap-0.5 rounded-card border px-3 py-2.5 text-left transition-colors ${
                  option.id === kind
                    ? "border-accent/50 bg-accent-soft"
                    : "border-line bg-surface-raised hover:border-ink-faint/40"
                }`}
              >
                <span
                  className={`text-sm font-semibold ${
                    option.id === kind ? "text-accent" : "text-ink"
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-xs text-ink-faint">{option.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          Nom
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={isMeasure ? "Ex. Tour de hanches" : "Ex. Rowing haltère"}
            autoFocus
            className="rounded-card border border-line bg-surface-raised px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint"
          />
        </label>

        {isMeasure ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-ink-muted">Je veux que ça</legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.id === goal}
                  onClick={() => setGoal(option.id)}
                  className={`rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    option.id === goal
                      ? "border-accent/50 bg-accent-soft text-accent"
                      : "border-line bg-surface-raised text-ink-muted hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-ink-muted">Groupe musculaire</legend>
            <div className="flex flex-wrap gap-2">
              {TRAINING_GROUPS.map((option) => {
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
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-ink-muted">Unité mesurée</legend>
          <div className="flex flex-wrap gap-2">
            {UNITS[kind].map((option) => (
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
            {isMeasure ? "Créer la mensuration" : "Créer l'exercice"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
