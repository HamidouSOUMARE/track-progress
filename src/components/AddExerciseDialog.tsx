"use client";

import { useState } from "react";
import { ExerciseFields, type ExerciseDraft } from "@/components/ExerciseFields";
import { Sheet } from "@/components/Sheet";
import { useTrackerStore } from "@/store/tracker-store";

interface AddExerciseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (exerciseId: string) => void;
}

const EMPTY_DRAFT: ExerciseDraft = {
  name: "",
  group: "pectoraux",
  unit: "kg",
  kind: "charge",
  goal: "up",
};

export function AddExerciseDialog({ open, onClose, onCreated }: AddExerciseDialogProps) {
  const addExercise = useTrackerStore((state) => state.addExercise);
  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_DRAFT);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      return;
    }

    const exercise = addExercise({ ...draft, name });
    setDraft(EMPTY_DRAFT);
    onCreated(exercise.id);
  };

  return (
    <Sheet open={open} title="Ajouter un suivi" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-ink">Ajouter un suivi</h2>

        <ExerciseFields draft={draft} onChange={setDraft} autoFocusName />

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
            disabled={draft.name.trim().length === 0}
            className="flex-[2] rounded-card bg-accent py-3 text-sm font-bold text-accent-ink transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {draft.kind === "mesure" ? "Créer la mensuration" : "Créer l'exercice"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
