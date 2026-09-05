"use client";

import { useMemo, useState } from "react";
import { ExerciseFields, type ExerciseDraft } from "@/components/ExerciseFields";
import { Collapsible } from "@/components/Collapsible";
import { SeriesPanel } from "@/components/SeriesPanel";
import { Sheet } from "@/components/Sheet";
import { DeltaBadge } from "@/components/DeltaBadge";
import { getMuscleGroup } from "@/data/muscle-groups";
import { celebrationKind, pickMessage } from "@/lib/encouragement";
import { parseAmount, sanitizeAmount, toAmountInput } from "@/lib/amount";
import {
  formatDate,
  formatRelativeDate,
  formatValue,
  formatWithUnit,
  unitSuffix,
} from "@/lib/format";
import { computeProgress, getIncrements } from "@/lib/progress";
import {
  entryOn,
  entrySeries,
  entryVolume,
  isEntryDone,
  lastPerformance,
  suggestedReps,
} from "@/lib/session";
import { useTrackerStore } from "@/store/tracker-store";
import type { CelebrationPayload } from "@/components/Celebration";
import type { Exercise, Tracking } from "@/lib/types";

interface UpdateSheetProps {
  exercise: Exercise | null;
  tracking: Tracking | undefined;
  onClose: () => void;
  onCelebrate: (payload: CelebrationPayload) => void;
  /** Remonte une action réversible pour que le tableau de bord propose de l'annuler. */
  onUndoable: (message: string) => void;
  /** Lance le repos une fois la série enregistrée. */
  onRestStart: (exercise: Exercise) => void;
  /** Coupe le repos : l'exercice est terminé, on passe au suivant. */
  onRestStop: () => void;
}

interface Opened {
  exercise: Exercise;
  tracking: Tracking | undefined;
}

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
  onUndoable,
  onRestStart,
  onRestStop,
}: UpdateSheetProps) {
  const startTracking = useTrackerStore((state) => state.startTracking);
  const updateReference = useTrackerStore((state) => state.updateReference);
  const logValue = useTrackerStore((state) => state.logValue);
  const removeEntry = useTrackerStore((state) => state.removeEntry);
  const logSet = useTrackerStore((state) => state.logSet);
  const removeLastSet = useTrackerStore((state) => state.removeLastSet);
  const finishExercise = useTrackerStore((state) => state.finishExercise);
  const removeExercise = useTrackerStore((state) => state.removeExercise);

  const setNote = useTrackerStore((state) => state.setNote);
  const setArchived = useTrackerStore((state) => state.setArchived);
  const updateExercise = useTrackerStore((state) => state.updateExercise);

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
  const [referenceDraft, setReferenceDraft] = useState<string>("");
  const [editingReference, setEditingReference] = useState(false);
  const [draft, setDraft] = useState<ExerciseDraft | null>(null);
  // Un seul panneau ouvert à la fois : la fiche reste lisible d'un coup d'œil.
  const [openPanel, setOpenPanel] = useState<"notes" | "historique" | null>(null);
  const [syncedId, setSyncedId] = useState<string | null>(exercise?.id ?? null);
  const [syncedTracking, setSyncedTracking] = useState<Tracking | undefined>(tracking);

  const now = new Date();
  const todayEntry = entryOn(activeTracking, now);
  const todaySeries = todayEntry ? entrySeries(todayEntry) : [];
  const finishedToday = todayEntry !== null && isEntryDone(todayEntry);
  const previous = lastPerformance(activeTracking, now);

  const activeId = exercise?.id ?? null;
  if (activeId !== syncedId) {
    setSyncedId(activeId);
    if (exercise) {
      setAmount(progress ? toAmountInput(progress.current) : "");
      // La série suivante part des répétitions les plus probables : celles de la
      // série précédente, sinon celles de la dernière séance.
      setReps(
        String(suggestedReps(todaySeries, previous, { targetRepsMax: exercise.targetRepsMax }) ?? ""),
      );
      setEditingReference(false);
      setDraft(null);
      setOpenPanel(null);
    }
  }

  // Le suivi a changé sous la fiche ouverte — référence modifiée, entrée
  // supprimée : le champ doit afficher la valeur actuelle, pas l'ancienne.
  if (activeTracking !== syncedTracking) {
    setSyncedTracking(activeTracking);
    if (activeTracking) {
      setAmount(toAmountInput(computeProgress(activeTracking, goal).current));
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
      reps: null,
      sets: null,
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
    onRestStart(active);
    onClose();
  };

  const handleReferenceSave = () => {
    const next = parseAmount(referenceDraft);
    if (next > 0) {
      updateReference(active.id, next);
    }
    setEditingReference(false);
  };

  const handleValidateSet = () => {
    const count = Number(reps);
    if (value <= 0 || !Number.isFinite(count) || count <= 0) {
      return;
    }

    const result = logSet(active.id, { value, reps: count });
    if (!result) {
      return;
    }

    vibrate([10]);

    if (result.reachedTarget) {
      // Dernière série : la célébration prend la place du repos.
      handleFinish();
      return;
    }

    onRestStart(active);
  };

  const handleFinish = () => {
    onRestStop();
    const result = finishExercise(active.id);
    if (!result) {
      onClose();
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft(
                draft
                  ? null
                  : {
                      name: active.name,
                      group: active.group,
                      unit: active.unit,
                      kind: active.kind,
                      goal: active.goal,
                      rest: active.rest,
                      targetSets: active.targetSets,
                      targetRepsMin: active.targetRepsMin,
                      targetRepsMax: active.targetRepsMax,
                    },
              )
            }
            aria-expanded={draft !== null}
            className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors ${
              draft
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-line text-ink-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            Fermer
          </button>
        </div>
      </header>

      {draft ? (
        <section className="mb-5 flex flex-col gap-5 rounded-card border border-line bg-surface-raised p-4">
          <ExerciseFields
            draft={draft}
            onChange={setDraft}
            entryCount={progress?.entryCount ?? 0}
            initialUnit={active.unit}
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="flex-1 rounded-card border border-line py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={draft.name.trim().length === 0}
              onClick={() => {
                updateExercise(active.id, { ...draft, name: draft.name.trim() });
                setDraft(null);
              }}
              className="flex-[2] rounded-card bg-accent py-2.5 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enregistrer
            </button>
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setArchived(active.id, active.archived !== true);
                  onClose();
                  onUndoable(active.archived ? `${active.name} réaffiché` : `${active.name} masqué`);
                }}
                className="flex-1 rounded-card border border-line py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                {active.archived ? "Réafficher" : "Masquer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeExercise(active.id);
                  onClose();
                  onUndoable(`${active.name} supprimé`);
                }}
                className="flex-1 rounded-card border border-line py-2.5 text-sm font-semibold text-ink-faint transition-colors hover:border-negative/40 hover:text-negative"
              >
                Supprimer
              </button>
            </div>
            <p className="text-center text-xs text-ink-faint">
              Masquer conserve l&apos;historique. Supprimer l&apos;efface définitivement.
            </p>
          </div>
        </section>
      ) : null}

      {progress ? (
        <dl className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-ink-faint">
          <span className="flex items-baseline gap-1.5">
            <dt>Référence</dt>
            <dd className="tabular font-semibold text-ink-muted">
              {formatWithUnit(progress.reference, active.unit)}
            </dd>
          </span>
          <span className="flex items-baseline gap-1.5">
            <dt>{isMeasure ? "Meilleur" : "Record"}</dt>
            <dd className="tabular font-semibold text-accent">
              {formatWithUnit(progress.best, active.unit)}
            </dd>
          </span>
        </dl>
      ) : (
        <p className="mb-5 rounded-card border border-line bg-surface-raised p-3 text-sm text-ink-muted">
          {isMeasure
            ? "Prends ta mesure du jour : elle deviendra ton point de départ."
            : "Indique la charge que tu utilises aujourd'hui : elle deviendra ta référence de départ."}
        </p>
      )}

      {previous ? (
        <p className="mb-3 flex flex-wrap items-baseline justify-center gap-x-2 text-sm text-ink-muted">
          <span className="text-xs tracking-wide text-ink-faint uppercase">La dernière fois</span>
          <span className="tabular font-semibold text-ink">
            {formatWithUnit(previous.value, active.unit)}
            {entrySeries(previous).length > 0 ? (
              <span className="font-normal text-ink-muted">
                {" "}
                × {entrySeries(previous).map((set) => set.reps).join(", ")}
              </span>
            ) : null}
          </span>
          <span className="text-xs text-ink-faint">{formatRelativeDate(previous.date)}</span>
        </p>
      ) : null}

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
            onKeyDown={(event) => {
              if (event.key === "Enter" && value > 0) {
                event.preventDefault();
                if (progress) {
                  handleSave();
                } else {
                  handleStart();
                }
              }
            }}
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

      {!progress || isMeasure ? (
        <button
          type="button"
          onClick={progress ? handleSave : handleStart}
          disabled={value <= 0}
          className="mt-5 w-full rounded-card bg-accent px-4 py-3.5 text-base font-bold text-accent-ink transition-transform hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {progress
            ? "Enregistrer la mesure"
            : isMeasure
              ? "Définir ma mesure de départ"
              : "Définir ma référence"}
        </button>
      ) : (
        <SeriesPanel
          exercise={active}
          series={todaySeries}
          reps={reps}
          onRepsChange={setReps}
          onValidate={handleValidateSet}
          onRemoveLast={() => removeLastSet(active.id)}
          onFinish={handleFinish}
          finished={finishedToday}
        />
      )}

      <Collapsible
        title="Notes"
        summary={active.note ?? (isMeasure ? "Conditions de mesure" : "Réglages, technique")}
        open={openPanel === "notes"}
        onToggle={() => setOpenPanel(openPanel === "notes" ? null : "notes")}
      >
        <label htmlFor={`note-${active.id}`} className="sr-only">
          Notes
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
      </Collapsible>

      {progress ? (
        <Collapsible
          title="Historique"
          summary={
            history.length === 0
              ? "Aucune séance enregistrée"
              : `${history.length} séance${history.length > 1 ? "s" : ""}`
          }
          open={openPanel === "historique"}
          onToggle={() => setOpenPanel(openPanel === "historique" ? null : "historique")}
        >
          <div className="mb-2 flex justify-end">
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
                aria-label="Nouvelle référence"
                onChange={(event) => setReferenceDraft(sanitizeAmount(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleReferenceSave();
                  }
                }}
                className="tabular w-full rounded-card border border-line bg-surface-raised px-3 py-2 text-base text-ink outline-none"
              />
              <button
                type="button"
                onClick={handleReferenceSave}
                className="rounded-card border border-accent/40 px-4 text-sm font-semibold text-accent"
              >
                Valider la référence
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
                  <div className="flex min-w-0 flex-col">
                    <span className="tabular text-sm font-semibold text-ink">
                      {formatWithUnit(entry.value, active.unit)}
                      {entrySeries(entry).length > 0 ? (
                        <span className="ml-2 text-xs font-normal text-ink-faint">
                          × {entrySeries(entry).map((set) => set.reps).join(", ")}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex flex-wrap gap-x-2 text-xs text-ink-faint">
                      <span>{formatDate(entry.date)}</span>
                      {!isMeasure && entryVolume(entry) > 0 ? (
                        <span className="tabular">
                          {formatValue(entryVolume(entry))} {unitSuffix(active.unit)} au total
                        </span>
                      ) : null}
                      {!isEntryDone(entry) ? (
                        <span className="text-accent">en cours</span>
                      ) : null}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeEntry(active.id, entry.id);
                      onUndoable(isMeasure ? "Mesure supprimée" : "Performance supprimée");
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
        </Collapsible>
      ) : null}

    </Sheet>
  );
}
