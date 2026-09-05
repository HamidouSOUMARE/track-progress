"use client";

import { Sheet } from "@/components/Sheet";
import { downloadJson } from "@/lib/backup";
import { sampleJson } from "@/lib/sample";

interface ImportHelpSheetProps {
  open: boolean;
  /** Message d'échec quand la feuille s'ouvre après un fichier refusé. */
  error: string | null;
  onClose: () => void;
  onPickFile: () => void;
}

export function ImportHelpSheet({ open, error, onClose, onPickFile }: ImportHelpSheetProps) {
  return (
    <Sheet open={open} title="Format d'import" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">Format d&apos;import</h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Fermer
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-card border border-negative/40 bg-negative/10 px-4 py-2.5 text-sm text-negative"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-ink-muted">
        Une sauvegarde est un fichier JSON qui contient tes suivis, leur historique et tes
        programmes. Le plus simple reste d&apos;<strong className="text-ink">exporter</strong>{" "}
        depuis l&apos;app puis de retoucher le fichier obtenu.
      </p>

      <h3 className="mt-5 mb-2 text-sm font-semibold text-ink">À quoi ça ressemble</h3>
      <pre className="max-h-64 overflow-auto rounded-card border border-line bg-surface-raised p-3 text-xs leading-relaxed text-ink-muted">
        <code>{sampleJson()}</code>
      </pre>

      <ul className="mt-4 flex flex-col gap-1.5 text-xs text-ink-faint">
        <li>
          <strong className="text-ink-muted">reference</strong> est le point de départ,{" "}
          <strong className="text-ink-muted">entries</strong> l&apos;historique qui s&apos;y
          compare. <strong className="text-ink-muted">value</strong> y porte la charge la plus
          lourde de la séance, et <strong className="text-ink-muted">series</strong> le détail
          série par série.
        </li>
        <li>
          <strong className="text-ink-muted">goal</strong> vaut <code>up</code> ou{" "}
          <code>down</code> selon le sens du progrès.
        </li>
        <li>
          <strong className="text-ink-muted">rest</strong> (secondes),{" "}
          <strong className="text-ink-muted">targetSets</strong> et{" "}
          <strong className="text-ink-muted">targetRepsMin</strong> /{" "}
          <strong className="text-ink-muted">targetRepsMax</strong> pilotent le chrono et les
          séries. Tous facultatifs.
        </li>
        <li>
          <strong className="text-ink-muted">days</strong> range les identifiants d&apos;exercices
          par jour de la semaine.
        </li>
      </ul>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => downloadJson(sampleJson(), "exemple")}
          className="flex-1 rounded-card border border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          Télécharger l&apos;exemple
        </button>
        <button
          type="button"
          onClick={onPickFile}
          className="flex-1 rounded-card bg-accent py-3 text-sm font-bold text-accent-ink transition-transform active:scale-[0.99]"
        >
          Choisir un fichier
        </button>
      </div>
    </Sheet>
  );
}
