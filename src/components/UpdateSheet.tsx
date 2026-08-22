"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { DeltaBadge } from "@/components/DeltaBadge";
import { getMuscleGroup } from "@/data/muscle-groups";
import { celebrationKind, pickMessage } from "@/lib/encouragement";
import { formatDate, formatValue, formatWithUnit, unitSuffix } from "@/lib/format";
import { computeProgress, getIncrements } from "@/lib/progress";
import { useTrackerStore } from "@/store/tracker-store";
import type { CelebrationPayload } from "@/components/Celebration";
import type { Exercise, Tracking } from "@/lib/types";

interface UpdateSheetProps {
  exercise: Exercise | null;
  tracking: Tracking | undefined;
  onClose: () => void;
  onCelebrate: (payload: CelebrationPayload) => void;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function vibrate(pattern: number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function UpdateSheet({ exercise, tracking, onClose, onCelebrate }: UpdateSheetProps) {
  const startTracking = useTrackerStore((state) => state.startTracking);
  const updateReference = useTrackerStore((state) => state.updateReference);
  const logValue = useTrackerStore((state) => state.logValue);
  const removeEntry = useTrackerStore((state) => state.removeEntry);
  const removeExercise = useTrackerStore((state) => state.removeExercise);

  const progress = useMemo(() => (tracking ? computeProgress(tracking) : null), [tracking]);
  const [value, setValue] = useState<number>(progress?.current ?? 0);
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [referenceDraft, setReferenceDraft] = useState<string>("");
  const [editingReference, setEditingReference] = useState(false);
  // On garde le dernier exercice affiché le temps de l'animation de fermeture.
  const [shown, setShown] = useState<Exercise | null>(exercise);
  const [syncedId, setSyncedId] = useState<string | null>(exercise?.id ?? null);

  const activeId = exercise?.id ?? null;
  if (activeId !== syncedId) {
    setSyncedId(activeId);
    if (exercise) {
      setShown(exercise);
      setValue(progress?.current ?? 0);
      setReps("");
      setSets("");
      setEditingReference(false);
    }
  }

  if (!shown) {
    return null;
  }

  const group = getMuscleGroup(shown.group);
  const accent = `var(${group.accent})`;
  const increments = getIncrements(shown.unit);
  const suffix = unitSuffix(shown.unit);

  const step = increments[0] ?? 1;

  const adjust = (amount: number) => {
    setValue((current) => Math.max(0, round(current + amount)));
    vibrate([8]);
  };

  const handleStart = () => {
    if (value <= 0) {
      return;
    }
    startTracking(shown.id, value);
    onClose();
  };

  const handleSave = () => {
    const result = logValue(shown.id, {
      value,
      reps: reps ? Number(reps) : null,
      sets: sets ? Number(sets) : null,
    });

    if (!result) {
      return;
    }

    const kind = celebrationKind(result.delta, result.record);
    vibrate(result.record ? [14, 40, 22] : [10]);
    onCelebrate({
      key: Date.now(),
      kind,
      message: pickMessage(kind),
      delta: result.delta,
      unit: shown.unit,
      exerciseName: shown.name,
    });
    onClose();
  };

  const handleReferenceSave = () => {
    const next = Number(referenceDraft);
    if (Number.isFinite(next) && next > 0) {
      updateReference(shown.id, next);
    }
    setEditingReference(false);
  };

  const history = tracking ? [...tracking.entries].reverse() : [];

  return (
    <Sheet open={exercise !== null} title={shown.name} onClose={onClose}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-ink-faint uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-pill"
              style={{ backgroundColor: accent }}
            />
            {group.label}
          </span>
          <h2 className="text-xl font-bold text-ink">{shown.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Fermer
        </button>
      </header>

      {progress ? (
        <dl className="mb-5 grid grid-cols-3 gap-2 rounded-card border border-line bg-surface-raised p-3 text-center">
          <div>
            <dt className="text-xs text-ink-faint">Référence</dt>
            <dd className="tabular text-sm font-bold text-ink">
              {formatWithUnit(progress.reference, shown.unit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Actuel</dt>
            <dd className="tabular text-sm font-bold text-ink">
              {formatWithUnit(progress.current, shown.unit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Record</dt>
            <dd className="tabular text-sm font-bold text-accent">
              {formatWithUnit(progress.best, shown.unit)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mb-5 rounded-card border border-line bg-surface-raised p-3 text-sm text-ink-muted">
          Indique la charge que tu utilises aujourd&apos;hui : elle deviendra ta référence de
          départ.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => adjust(-step)}
          aria-label={`Retirer ${formatValue(step)} ${suffix}`}
          className="size-12 shrink-0 rounded-card border border-line text-2xl font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          −
        </button>

        <label className="flex flex-1 items-baseline justify-center gap-2">
          <span className="sr-only">Charge en {suffix}</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={value}
            onChange={(event) => setValue(Math.max(0, Number(event.target.value)))}
            className="tabular w-full min-w-0 bg-transparent text-center text-5xl font-black text-ink outline-none"
          />
          <span className="text-lg font-semibold text-ink-muted">{suffix}</span>
        </label>

        <button
          type="button"
          onClick={() => adjust(step)}
          aria-label={`Ajouter ${formatValue(step)} ${suffix}`}
          className="size-12 shrink-0 rounded-card border border-line text-2xl font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          +
        </button>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {increments.map((increment) => (
          <button
            key={increment}
            type="button"
            onClick={() => adjust(increment)}
            className="rounded-pill border border-line bg-surface-raised px-3.5 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            +{formatValue(increment)} {suffix}
          </button>
        ))}
      </div>

      {progress ? (
        <div className="mt-4 flex justify-center">
          <DeltaBadge
            delta={round(value - progress.reference)}
            ratio={progress.reference > 0 ? (value - progress.reference) / progress.reference : 0}
            unit={shown.unit}
          />
        </div>
      ) : null}

      {progress ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Répétitions
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              placeholder="8"
              className="tabular rounded-card border border-line bg-surface-raised px-3 py-2 text-base text-ink outline-none placeholder:text-ink-faint"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Séries
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={sets}
              onChange={(event) => setSets(event.target.value)}
              placeholder="4"
              className="tabular rounded-card border border-line bg-surface-raised px-3 py-2 text-base text-ink outline-none placeholder:text-ink-faint"
            />
          </label>
        </div>
      ) : null}

      <button
        type="button"
        onClick={progress ? handleSave : handleStart}
        disabled={value <= 0}
        className="mt-5 w-full rounded-card bg-accent px-4 py-3.5 text-base font-bold text-accent-ink transition-transform hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {progress ? "Enregistrer la performance" : "Définir ma référence"}
      </button>

      {progress ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Historique</h3>
            <button
              type="button"
              onClick={() => {
                setReferenceDraft(String(progress.reference));
                setEditingReference((open) => !open);
              }}
              className="text-xs font-semibold text-ink-muted underline-offset-4 hover:text-accent hover:underline"
            >
              Modifier la référence
            </button>
          </div>

          {editingReference ? (
            <div className="mb-3 flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={referenceDraft}
                onChange={(event) => setReferenceDraft(event.target.value)}
                className="tabular w-full rounded-card border border-line bg-surface-raised px-3 py-2 text-base text-ink outline-none"
              />
              <button
                type="button"
                onClick={handleReferenceSave}
                className="rounded-card border border-accent/40 px-4 text-sm font-semibold text-accent"
              >
                Valider
              </button>
            </div>
          ) : null}

          {history.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Aucune mise à jour pour l&apos;instant. La première arrive vite.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex flex-col">
                    <span className="tabular text-sm font-semibold text-ink">
                      {formatWithUnit(entry.value, shown.unit)}
                      {entry.reps ? (
                        <span className="ml-2 text-xs font-normal text-ink-faint">
                          {entry.sets ? `${entry.sets} × ` : ""}
                          {entry.reps} reps
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-ink-faint">{formatDate(entry.date)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(shown.id, entry.id)}
                    aria-label={`Supprimer la performance du ${formatDate(entry.date)}`}
                    className="rounded-pill px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {shown.custom ? (
        <button
          type="button"
          onClick={() => {
            removeExercise(shown.id);
            onClose();
          }}
          className="mt-6 w-full rounded-card border border-line py-2.5 text-sm font-semibold text-ink-faint transition-colors hover:border-negative/40 hover:text-negative"
        >
          Supprimer cet exercice
        </button>
      ) : null}
    </Sheet>
  );
}
