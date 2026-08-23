"use client";

import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import type { Goal, MuscleGroupId, TrackKind, Unit } from "@/lib/types";

/** Champs partagés par la création et l'édition, pour qu'ils ne divergent pas. */
export interface ExerciseDraft {
  name: string;
  group: MuscleGroupId;
  unit: Unit;
  kind: TrackKind;
  goal: Goal;
}

interface ExerciseFieldsProps {
  draft: ExerciseDraft;
  onChange: (draft: ExerciseDraft) => void;
  /** Nombre de valeurs déjà enregistrées, pour avertir d'un changement d'unité. */
  entryCount?: number;
  initialUnit?: Unit;
  autoFocusName?: boolean;
}

const KINDS: { id: TrackKind; label: string; hint: string }[] = [
  { id: "charge", label: "Exercice", hint: "une performance à la salle" },
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

const GOALS: { id: Goal; label: string; hint: string }[] = [
  { id: "up", label: "↑ Augmenter", hint: "une charge, des répétitions" },
  { id: "down", label: "↓ Réduire", hint: "un tour de taille, une assistance" },
];

const TRAINING_GROUPS = MUSCLE_GROUPS.filter((group) => group.id !== "mensurations");

const PILL_BASE =
  "rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition-colors";
const PILL_ON = "border-accent/50 bg-accent-soft text-accent";
const PILL_OFF = "border-line bg-surface-raised text-ink-muted hover:text-ink";

export function ExerciseFields({
  draft,
  onChange,
  entryCount = 0,
  initialUnit,
  autoFocusName = false,
}: ExerciseFieldsProps) {
  const isMeasure = draft.kind === "mesure";
  const unitChanged = initialUnit !== undefined && initialUnit !== draft.unit;

  const patch = (values: Partial<ExerciseDraft>) => onChange({ ...draft, ...values });

  const switchKind = (kind: TrackKind) => {
    // Les unités ne se recouvrent pas d'un type à l'autre : on repart du défaut.
    patch({
      kind,
      unit: kind === "mesure" ? "cm" : "kg",
      group: kind === "mesure" ? "mensurations" : "pectoraux",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Type de suivi</legend>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === draft.kind}
              onClick={() => switchKind(option.id)}
              className={`flex flex-col gap-0.5 rounded-card border px-3 py-2.5 text-left transition-colors ${
                option.id === draft.kind
                  ? "border-accent/50 bg-accent-soft"
                  : "border-line bg-surface-raised hover:border-ink-faint/40"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  option.id === draft.kind ? "text-accent" : "text-ink"
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
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder={isMeasure ? "Ex. Tour de hanches" : "Ex. Rowing haltère"}
          autoFocus={autoFocusName}
          className="rounded-card border border-line bg-surface-raised px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint"
        />
      </label>

      {!isMeasure ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-ink-muted">Groupe musculaire</legend>
          <div className="flex flex-wrap gap-2">
            {TRAINING_GROUPS.map((option) => {
              const selected = option.id === draft.group;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => patch({ group: option.id })}
                  className={`${PILL_BASE} ${
                    selected ? "border-transparent text-accent-ink" : PILL_OFF
                  }`}
                  style={selected ? { backgroundColor: `var(${option.accent})` } : undefined}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Unité mesurée</legend>
        <div className="flex flex-wrap gap-2">
          {UNITS[draft.kind].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === draft.unit}
              onClick={() => patch({ unit: option.id })}
              className={`${PILL_BASE} ${option.id === draft.unit ? PILL_ON : PILL_OFF}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {unitChanged && entryCount > 0 ? (
          <p className="text-xs text-ink-faint">
            Les {entryCount} valeur{entryCount > 1 ? "s" : ""} déjà enregistrée
            {entryCount > 1 ? "s" : ""} gardent leur nombre : seule l&apos;unité affichée change.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Le progrès va vers</legend>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === draft.goal}
              title={option.hint}
              onClick={() => patch({ goal: option.id })}
              className={`${PILL_BASE} ${option.id === draft.goal ? PILL_ON : PILL_OFF}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
