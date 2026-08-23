"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { DeltaBadge } from "@/components/DeltaBadge";
import { getMuscleGroup } from "@/data/muscle-groups";
import { celebrationKind, pickMessage } from "@/lib/encouragement";
import { parseAmount, sanitizeAmount, toAmountInput } from "@/lib/amount";
import { formatDate, formatValue, formatWithUnit, unitSuffix } from "@/lib/format";
import { computeProgress, getIncrements } from "@/lib/progress";
import { useTrackerStore } from "@/store/tracker-store";
import type { CelebrationPayload } from "@/components/Celebration";
import type { Exercise, Goal, Tracking } from "@/lib/types";

interface UpdateSheetProps {
  exercise: Exercise | null;
  tracking: Tracking | undefined;
  onClose: () => void;
  onCelebrate: (payload: CelebrationPayload) => void;
  /** Remonte la suppression pour que le tableau de bord propose de l'annuler. */
  onDeleted: (message: string) => void;
}

interface Opened {
  exercise: Exercise;
  tracking: Tracking | undefined;
}

const GOALS: { id: Goal; label: string }[] = [
  { id: "up", label: "↑ Augmenter" },
  { id: "down", label: "↓ Réduire" },
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function vibrate(pattern: number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function UpdateSheet({
  exercise,
  tracking,
  onClose,
  onCelebrate,
  onDeleted,
}: UpdateSheetProps) {
  const startTracking = useTrackerStore((state) => state.startTracking);
  const updateReference = useTrackerStore((state) => state.updateReference);
  const logValue = useTrackerStore((state) => state.logValue);
  const removeEntry = useTrackerStore((state) => state.removeEntry);
  const removeExercise = useTrackerStore((state) => state.removeExercise);

  const setGoal = useTrackerStore((state) => state.setGoal);
  const setNote = useTrackerStore((state) => state.setNote);

  // La feuille reste affichée le temps de se refermer : on garde sous la main
  // le dernier suivi ouvert plutôt que de la vider d'un coup.
  const [lastOpened, setLastOpened] = useState<Opened | null>(
    exercise ? { exercise, tracking } : null,
  );

  if (exercise && (lastOpened?.exercise !== exercise || lastOpened?.tracking !== tracking)) {
    setLastOpened({ exercise, tracking });
  }

  const active = exercise ?? lastOpened?.exercise ?? null;
  const activeTracking = exercise ? tracking : lastOpened?.tracking;
  const goal = active?.goal ?? "up";

  const progress = useMemo(
    () => (activeTracking ? computeProgress(activeTracking, goal) : null),
    [activeTracking, goal],
  );
  // Le champ garde la saisie brute : voir sanitizeAmount pour le pourquoi.
  const [amount, setAmount] = useState<string>(progress ? toAmountInput(progress.current) : "");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [referenceDraft, setReferenceDraft] = useState<string>("");
  const [editingReference, setEditingReference] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(exercise?.id ?? null);

  const activeId = exercise?.id ?? null;
  if (activeId !== syncedId) {
    setSyncedId(activeId);
    if (exercise) {
      setAmount(progress ? toAmountInput(progress.current) : "");
      setReps("");
      setSets("");
      setEditingReference(false);
    }
  }

  if (!active) {
    return null;
  }

  const group = getMuscleGroup(active.group);
  const accent = `var(${group.accent})`;
  const isMeasure = active.kind === "mesure";
  const increments = getIncrements(active.unit, active.kind);
  const suffix = unitSuffix(active.unit);

  const step = increments[0] ?? 1;
  const value = parseAmount(amount);

  const adjust = (increment: number) => {
    setAmount((current) => toAmountInput(Math.max(0, round(parseAmount(current) + increment))));
    vibrate([8]);
  };

  const handleStart = () => {
    if (value <= 0) {
      return;
    }
    startTracking(active.id, value);
    onClose();
  };

  const handleSave = () => {
    const result = logValue(active.id, {
      value,
      reps: reps ? Number(reps) : null,
      sets: sets ? Number(sets) : null,
    });

    if (!result) {
      return;
    }

    const kind = celebrationKind(result.gain, result.record);
    vibrate(result.record ? [14, 40, 22] : [10]);
    onCelebrate({
      key: Date.now(),
      kind,
      message: pickMessage(kind, active.goal),
      delta: result.delta,
      unit: active.unit,
      exerciseName: active.name,
    });
    onClose();
  };

  const handleReferenceSave = () => {
    const next = parseAmount(referenceDraft);
    if (next > 0) {
      updateReference(active.id, next);
    }
    setEditingReference(false);
  };

  const history = activeTracking ? [...activeTracking.entries].reverse() : [];

  return (
    <Sheet open={exercise !== null} title={active.name} onClose={onClose}>
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
          <h2 className="text-xl font-bold text-ink">{active.name}</h2>
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
              {formatWithUnit(progress.reference, active.unit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Actuel</dt>
            <dd className="tabular text-sm font-bold text-ink">
              {formatWithUnit(progress.current, active.unit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{isMeasure ? "Meilleur" : "Record"}</dt>
            <dd className="tabular text-sm font-bold text-accent">
              {formatWithUnit(progress.best, active.unit)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mb-5 rounded-card border border-line bg-surface-raised p-3 text-sm text-ink-muted">
          {isMeasure
            ? "Prends ta mesure du jour : elle deviendra ton point de départ."
            : "Indique la charge que tu utilises aujourd'hui : elle deviendra ta référence de départ."}
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
          <span className="sr-only">
            {isMeasure ? "Mesure" : "Charge"} en {suffix}
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(sanitizeAmount(event.target.value))}
            placeholder="0"
            className="tabular w-full min-w-0 bg-transparent text-center text-5xl font-black text-ink outline-none placeholder:text-ink-faint"
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
            gain={round(active.goal === "up" ? value - progress.reference : progress.reference - value)}
            ratio={
              progress.reference > 0
                ? (active.goal === "up" ? value - progress.reference : progress.reference - value) /
                  progress.reference
                : 0
            }
            unit={active.unit}
          />
        </div>
      ) : null}

      {progress && !isMeasure ? (
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

      {isMeasure ? (
        <fieldset className="mt-5 flex items-center justify-between gap-3 rounded-card border border-line bg-surface-raised px-3 py-2.5">
          <legend className="sr-only">Sens de l&apos;objectif</legend>
          <span className="text-xs font-medium text-ink-muted">Je veux que ça</span>
          <div className="flex gap-1.5">
            {GOALS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={active.goal === option.id}
                onClick={() => setGoal(active.id, option.id)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active.goal === option.id
                    ? "border-accent/50 bg-accent-soft text-accent"
                    : "border-line text-ink-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <button
        type="button"
        onClick={progress ? handleSave : handleStart}
        disabled={value <= 0}
        className="mt-5 w-full rounded-card bg-accent px-4 py-3.5 text-base font-bold text-accent-ink transition-transform hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {progress
          ? isMeasure
            ? "Enregistrer la mesure"
            : "Enregistrer la performance"
          : isMeasure
            ? "Définir ma mesure de départ"
            : "Définir ma référence"}
      </button>

      <section className="mt-6">
        <label
          htmlFor={`note-${active.id}`}
          className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"
        >
          Notes
          <span className="text-xs font-normal text-ink-faint">
            {isMeasure ? "conditions de mesure" : "réglages, technique"}
          </span>
        </label>
        <textarea
          id={`note-${active.id}`}
          value={active.note ?? ""}
          onChange={(event) => setNote(active.id, event.target.value)}
          rows={3}
          placeholder={
            isMeasure
              ? "Ex. le matin à jeun, au niveau du nombril"
              : "Ex. siège cran 4, poignées larges, souffler en haut"
          }
          className="w-full resize-y rounded-card border border-line bg-surface-raised px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
      </section>

      {progress ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Historique</h3>
            <button
              type="button"
              onClick={() => {
                setReferenceDraft(toAmountInput(progress.reference));
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
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={referenceDraft}
                onChange={(event) => setReferenceDraft(sanitizeAmount(event.target.value))}
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
                      {formatWithUnit(entry.value, active.unit)}
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
                    onClick={() => {
                      removeEntry(active.id, entry.id);
                      onDeleted(isMeasure ? "Mesure supprimée" : "Performance supprimée");
                    }}
                    aria-label={`Supprimer la performance du ${formatDate(entry.date)}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-pill text-base leading-none text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          removeExercise(active.id);
          onClose();
          onDeleted(`${active.name} supprimé`);
        }}
        className="mt-6 w-full rounded-card border border-line py-2.5 text-sm font-semibold text-ink-faint transition-colors hover:border-negative/40 hover:text-negative"
      >
        {isMeasure ? "Supprimer cette mensuration" : "Supprimer cet exercice"}
      </button>
    </Sheet>
  );
}
