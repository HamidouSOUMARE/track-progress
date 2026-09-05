"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { Celebration, type CelebrationPayload } from "@/components/Celebration";
import {
  ImportDialog,
  type ImportMode,
  type ImportPreview,
} from "@/components/ImportDialog";
import { ImportHelpSheet } from "@/components/ImportHelpSheet";
import { LibraryView } from "@/components/LibraryView";
import { ProgramsSheet } from "@/components/ProgramsSheet";
import { SessionView } from "@/components/SessionView";
import { RestTimer, type RestPeriod } from "@/components/RestTimer";
import { Toast, type ToastMessage } from "@/components/Toast";
import { UpdateSheet } from "@/components/UpdateSheet";
import { downloadSnapshot, readSnapshot } from "@/lib/backup";
import { nextInSession, restSeconds } from "@/lib/session";
import { todayWeekday } from "@/data/weekdays";
import { useHydrated, useTrackerStore } from "@/store/tracker-store";
import type { Exercise } from "@/lib/types";

type View = "session" | "library";

const VIEWS: { id: View; label: string }[] = [
  { id: "session", label: "Séance" },
  { id: "library", label: "Tous les suivis" },
];

export function Dashboard() {
  const exercises = useTrackerStore((state) => state.exercises);
  const trackings = useTrackerStore((state) => state.trackings);
  const programs = useTrackerStore((state) => state.programs);
  const activeProgramId = useTrackerStore((state) => state.activeProgramId);
  const replaceAll = useTrackerStore((state) => state.replaceAll);
  const mergeAll = useTrackerStore((state) => state.mergeAll);
  const undoDelete = useTrackerStore((state) => state.undoDelete);
  const hydrated = useHydrated();

  const [view, setView] = useState<View>("session");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [managingPrograms, setManagingPrograms] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingImport, setPendingImport] = useState<ImportPreview | null>(null);
  const [rest, setRest] = useState<RestPeriod | null>(null);
  const [importHelp, setImportHelp] = useState<{ error: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected: Exercise | null =
    exercises.find((exercise) => exercise.id === selectedId) ?? null;

  /**
   * Le repos démarre à l'enregistrement. On annonce l'exercice suivant de la
   * séance du jour quand il y en a un : c'est ce qu'on veut lire en soufflant.
   */
  const startRest = (exercise: Exercise) => {
    const seconds = restSeconds(exercise);
    if (seconds <= 0) {
      return;
    }

    const today = new Date();
    const program = programs.find((item) => item.id === activeProgramId) ?? programs[0] ?? null;
    const planned = program?.days[todayWeekday(today)] ?? [];
    const next = nextInSession(planned, exercises, trackings, exercise.id, today);

    setRest({
      key: Date.now(),
      endsAt: Date.now() + seconds * 1000,
      seconds,
      exerciseName: exercise.name,
      nextName: next?.name ?? null,
    });
  };

  const flash = (message: string, actionLabel?: string) => {
    const key = Date.now();
    setToast({ key, message, actionLabel });
    // Une annulation mérite un peu plus de temps qu'un simple accusé de réception.
    window.setTimeout(
      () => setToast((current) => (current?.key === key ? null : current)),
      actionLabel ? 6000 : 4000,
    );
  };

  /** On lit le fichier, puis on laisse l'utilisateur choisir : fusionner ou remplacer. */
  const handleFile = async (file: File) => {
    try {
      const report = readSnapshot(await file.text());
      setPendingImport({ fileName: file.name, ...report });
    } catch (error) {
      // Un fichier refusé sans explication est une impasse : on montre le format attendu.
      setImportHelp({ error: error instanceof Error ? error.message : "Import impossible" });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = (mode: ImportMode) => {
    if (!pendingImport) {
      return;
    }

    if (mode === "merge") {
      mergeAll(pendingImport.snapshot);
      flash("Sauvegarde fusionnée");
    } else {
      replaceAll(pendingImport.snapshot);
      flash("Sauvegarde restaurée");
    }

    setPendingImport(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-ink-faint uppercase">
            <span aria-hidden="true" className="size-2 rounded-pill bg-accent" />
            Track Progress
          </span>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">
            Tes charges, <span className="text-accent">en hausse</span>
          </h1>
          <p className="text-sm text-ink-muted">
            Note ta charge après chaque série et regarde la courbe monter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSnapshot({ exercises, trackings, programs, activeProgramId })}
            className="rounded-pill border border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            Exporter
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-pill border border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            Importer
          </button>
          <button
            type="button"
            onClick={() => setImportHelp({ error: null })}
            aria-label="Format d'import et fichier d'exemple"
            title="Format d'import et fichier d'exemple"
            className="flex size-8 items-center justify-center rounded-pill border border-line text-xs font-bold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            ?
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-pill bg-accent px-4 py-2 text-xs font-bold text-accent-ink transition-transform active:scale-95"
          >
            + Suivi
          </button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Vue"
        className="flex gap-1 self-start rounded-pill border border-line bg-surface p-1"
      >
        {VIEWS.map((option) => {
          const selectedView = option.id === view;

          return (
            <button
              key={option.id}
              role="tab"
              type="button"
              aria-selected={selectedView}
              onClick={() => setView(option.id)}
              className={`relative rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors ${
                selectedView ? "text-accent-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {selectedView ? (
                <motion.span
                  layoutId="view-switch"
                  className="absolute inset-0 rounded-pill bg-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>

      {!hydrated ? (
        <p className="py-16 text-center text-sm text-ink-faint">Chargement de tes données…</p>
      ) : view === "session" ? (
        <SessionView
          onOpenExercise={setSelectedId}
          onManagePrograms={() => setManagingPrograms(true)}
        />
      ) : (
        <LibraryView onOpenExercise={setSelectedId} onAdd={() => setAdding(true)} />
      )}

      <UpdateSheet
        exercise={selected}
        tracking={selected ? trackings[selected.id] : undefined}
        onClose={() => setSelectedId(null)}
        onCelebrate={setCelebration}
        onUndoable={(message) => flash(message, "Annuler")}
        onRestStart={startRest}
        onRestStop={() => setRest(null)}
      />

      <AddExerciseDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(exerciseId) => {
          setAdding(false);
          setSelectedId(exerciseId);
        }}
      />

      <ProgramsSheet
        open={managingPrograms}
        onClose={() => setManagingPrograms(false)}
        onDeleted={(message) => flash(message, "Annuler")}
      />

      <ImportHelpSheet
        open={importHelp !== null}
        error={importHelp?.error ?? null}
        onClose={() => setImportHelp(null)}
        onPickFile={() => {
          setImportHelp(null);
          fileInputRef.current?.click();
        }}
      />

      <ImportDialog
        preview={pendingImport}
        currentExercises={exercises}
        currentPrograms={programs}
        onCancel={() => setPendingImport(null)}
        onConfirm={handleImport}
      />

      <RestTimer
        rest={rest}
        onExtend={(seconds) =>
          setRest((current) =>
            current ? { ...current, endsAt: current.endsAt + seconds * 1000 } : current,
          )
        }
        onDismiss={() => setRest(null)}
      />

      <Toast
        toast={toast}
        onAction={() => {
          undoDelete();
          setToast(null);
        }}
        onDismiss={() => setToast(null)}
      />

      <Celebration payload={celebration} onDone={() => setCelebration(null)} />
    </div>
  );
}
