"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import type { Exercise, Program } from "@/lib/types";
import type { TrackerSnapshot } from "@/store/tracker-store";

export type ImportMode = "merge" | "replace";

export interface ImportPreview {
  fileName: string;
  snapshot: TrackerSnapshot;
}

interface ImportDialogProps {
  preview: ImportPreview | null;
  currentExercises: Exercise[];
  currentPrograms: Program[];
  onCancel: () => void;
  onConfirm: (mode: ImportMode) => void;
}

function countMissing(source: { id: string }[], known: Set<string>): number {
  return source.filter((item) => !known.has(item.id)).length;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

/** « 3 suivis et 1 programme », en n'énonçant que ce qui est concerné. */
function describe(exercises: number, programs: number): string {
  const parts = [
    exercises > 0 ? plural(exercises, "suivi") : null,
    programs > 0 ? plural(programs, "programme") : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" et ");
}

export function ImportDialog({
  preview,
  currentExercises,
  currentPrograms,
  onCancel,
  onConfirm,
}: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>("merge");
  // Comme la feuille de mise à jour, on garde le contenu le temps de la fermeture.
  const [shown, setShown] = useState<ImportPreview | null>(preview);

  if (preview && preview !== shown) {
    setShown(preview);
    setMode("merge");
  }

  if (!shown) {
    return null;
  }

  const incoming = shown.snapshot.exercises;
  const incomingPrograms = shown.snapshot.programs;
  const incomingIds = new Set(incoming.map((exercise) => exercise.id));
  const incomingProgramIds = new Set(incomingPrograms.map((program) => program.id));
  const currentIds = new Set(currentExercises.map((exercise) => exercise.id));
  const currentProgramIds = new Set(currentPrograms.map((program) => program.id));

  const added = countMissing(incoming, currentIds);
  const addedPrograms = countMissing(incomingPrograms, currentProgramIds);
  const removed = countMissing(currentExercises, incomingIds);
  const removedPrograms = countMissing(currentPrograms, incomingProgramIds);

  const gained = describe(added, addedPrograms);
  const lost = describe(removed, removedPrograms);

  const options: { id: ImportMode; label: string; hint: string }[] = [
    {
      id: "merge",
      label: "Fusionner",
      hint: gained
        ? `Ajoute ${gained} et complète les historiques. Rien n'est supprimé.`
        : "Complète les historiques existants. Rien n'est supprimé.",
    },
    {
      id: "replace",
      label: "Remplacer",
      hint: lost
        ? `Restaure la sauvegarde à l'identique. ${lost} seront supprimés, historique compris.`
        : "Restaure la sauvegarde à l'identique.",
    },
  ];

  return (
    <Sheet open={preview !== null} title="Importer une sauvegarde" onClose={onCancel}>
      <h2 className="text-xl font-bold text-ink">Importer une sauvegarde</h2>
      <p className="mt-1 text-sm text-ink-muted">
        <span className="font-medium text-ink">{shown.fileName}</span> contient{" "}
        <span className="font-medium text-ink">
          {describe(incoming.length, incomingPrograms.length) || "aucune donnée"}
        </span>
        . Tu as {describe(currentExercises.length, currentPrograms.length)}.
      </p>

      <div role="radiogroup" aria-label="Mode d'import" className="mt-5 flex flex-col gap-2">
        {options.map((option) => {
          const destructive = option.id === "replace" && lost.length > 0;

          return (
            <label
              key={option.id}
              className={`flex cursor-pointer flex-col gap-1 rounded-card border px-4 py-3 transition-colors has-[:checked]:border-accent/50 has-[:checked]:bg-accent-soft ${
                mode === option.id ? "border-accent/50" : "border-line bg-surface-raised"
              }`}
            >
              <input
                type="radio"
                name="import-mode"
                value={option.id}
                checked={mode === option.id}
                onChange={() => setMode(option.id)}
                className="sr-only"
              />
              <span
                className={`text-sm font-bold ${mode === option.id ? "text-accent" : "text-ink"}`}
              >
                {option.label}
              </span>
              <span className={`text-xs ${destructive ? "text-negative" : "text-ink-faint"}`}>
                {option.hint}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-card border border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onConfirm(mode)}
          className="flex-[2] rounded-card bg-accent py-3 text-sm font-bold text-accent-ink transition-transform active:scale-[0.99]"
        >
          Importer
        </button>
      </div>
    </Sheet>
  );
}
