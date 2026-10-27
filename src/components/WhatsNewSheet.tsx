"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sheet } from "@/components/Sheet";
import { formatDate } from "@/lib/format";
import type { Release, ReleaseNoteKind } from "@/data/changelog";

interface WhatsNewSheetProps {
  releases: readonly Release[];
  onClose: () => void;
}

const KINDS: Record<ReleaseNoteKind, { label: string; symbol: string; tone: string }> = {
  nouveau: { label: "Nouveau", symbol: "✦", tone: "bg-accent-soft text-accent" },
  ameliore: { label: "Amélioré", symbol: "↑", tone: "bg-surface-hover text-ink-muted" },
};

/**
 * Une fois par version, à l'ouverture : ce qui a changé, en quelques lignes. On
 * la referme d'un geste, et elle reste consultable en bas de page.
 */
export function WhatsNewSheet({ releases, onClose }: WhatsNewSheetProps) {
  const reduceMotion = useReducedMotion();
  const latest = releases[0];
  const notes = releases.flatMap((release) => release.notes);

  return (
    <Sheet open={latest !== undefined} title="Quoi de neuf" onClose={onClose}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-5 -top-9 h-40"
          style={{
            background:
              "radial-gradient(60% 70% at 50% 0%, var(--color-accent-soft), transparent 75%)",
          }}
        />

        <header className="relative flex flex-col items-start gap-2">
          <span className="rounded-pill border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-bold tracking-wide text-accent uppercase">
            Mise à jour
            {latest ? (
              <span className="font-medium normal-case"> · {formatDate(latest.date)}</span>
            ) : null}
          </span>
          <h2 className="text-2xl font-black text-ink">
            Quoi de <span className="text-accent">neuf</span> ?
          </h2>
          <p className="text-sm text-ink-muted">Ce qui a changé depuis ta dernière visite.</p>
        </header>

        <ul className="relative mt-5 flex flex-col gap-3">
          {notes.map((note, index) => {
            const kind = KINDS[note.kind];

            return (
              <motion.li
                key={`${note.title}-${index}`}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.06, duration: 0.25 }}
                className="flex gap-3 rounded-card border border-line bg-surface-raised p-3"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-card text-base font-black ${kind.tone}`}
                >
                  {kind.symbol}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-bold text-ink">{note.title}</span>
                    <span className="text-xs font-semibold text-ink-faint">{kind.label}</span>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-muted">
                    {note.description}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="relative mt-5 w-full rounded-card bg-accent px-4 py-3.5 text-base font-bold text-accent-ink transition-transform hover:bg-accent-strong active:scale-[0.99]"
        >
          C&apos;est parti
        </button>
      </div>
    </Sheet>
  );
}
