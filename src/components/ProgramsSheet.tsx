"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { WEEKDAYS } from "@/data/weekdays";
import { useTrackerStore } from "@/store/tracker-store";
import type { Program } from "@/lib/types";

interface ProgramsSheetProps {
  open: boolean;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

function countExercises(program: Program): number {
  return WEEKDAYS.reduce((total, day) => total + program.days[day.id].length, 0);
}

function countDays(program: Program): number {
  return WEEKDAYS.filter((day) => program.days[day.id].length > 0).length;
}

export function ProgramsSheet({ open, onClose, onDeleted }: ProgramsSheetProps) {
  const programs = useTrackerStore((state) => state.programs);
  const activeProgramId = useTrackerStore((state) => state.activeProgramId);
  const createProgram = useTrackerStore((state) => state.createProgram);
  const renameProgram = useTrackerStore((state) => state.renameProgram);
  const deleteProgram = useTrackerStore((state) => state.deleteProgram);
  const setActiveProgram = useTrackerStore((state) => state.setActiveProgram);

  const [draft, setDraft] = useState("");

  const create = (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) {
      return;
    }

    setActiveProgram(createProgram(name).id);
    setDraft("");
  };

  return (
    <Sheet open={open} title="Mes programmes" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Mes programmes</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Le programme suivi s&apos;affiche dans l&apos;onglet Séance.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Fermer
        </button>
      </div>

      {programs.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2">
          {programs.map((program) => {
            const active = program.id === activeProgramId;

            return (
              <li
                key={program.id}
                className={`flex flex-col gap-2 rounded-card border px-3 py-3 transition-colors ${
                  active ? "border-accent/50 bg-accent-soft" : "border-line bg-surface-raised"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`Suivre ${program.name}`}
                    onClick={() => setActiveProgram(program.id)}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-pill border ${
                      active ? "border-accent bg-accent" : "border-line"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-pill ${active ? "bg-accent-ink" : "bg-transparent"}`}
                    />
                  </button>

                  <input
                    type="text"
                    value={program.name}
                    onChange={(event) => renameProgram(program.id, event.target.value)}
                    aria-label={`Nom du programme ${program.name}`}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      deleteProgram(program.id);
                      onDeleted(`Programme « ${program.name} » supprimé`);
                    }}
                    aria-label={`Supprimer le programme ${program.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-pill text-base text-ink-faint transition-colors hover:bg-surface-hover hover:text-negative"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>

                <p className="pl-7 text-xs text-ink-faint">
                  {countExercises(program)} exercices sur {countDays(program)} jour
                  {countDays(program) > 1 ? "s" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
          Aucun programme pour l&apos;instant. Donne-lui un nom pour commencer.
        </p>
      )}

      <form onSubmit={create} className="mt-5 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex. Push Pull Legs"
          aria-label="Nom du nouveau programme"
          className="min-w-0 flex-1 rounded-card border border-line bg-surface-raised px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="shrink-0 rounded-card bg-accent px-4 text-sm font-bold text-accent-ink disabled:opacity-40"
        >
          Créer
        </button>
      </form>
    </Sheet>
  );
}
