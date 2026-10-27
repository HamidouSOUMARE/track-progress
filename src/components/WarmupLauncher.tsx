"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DurationPicker } from "@/components/DurationPicker";
import { formatDuration } from "@/lib/format";
import { MAX_REST_SECONDS, MAX_WARMUP_SECONDS } from "@/lib/session";
import { useTrackerStore } from "@/store/tracker-store";

const WARMUPS = [180, 300, 600] as const;
const RESTS_AFTER = [0, 60, 120] as const;

interface WarmupLauncherProps {
  onStart: (seconds: number) => void;
  /** Place du bouton replié ; le choix de la durée prend toute la largeur. */
  align?: "start" | "center";
  className?: string;
}

/**
 * Discret tant qu'on n'en a pas besoin : un bouton, qui déplie le choix de la
 * durée. La dernière durée lancée est reproposée, pour repartir en un tap.
 */
export function WarmupLauncher({ onStart, align = "start", className = "" }: WarmupLauncherProps) {
  const warmupSeconds = useTrackerStore((state) => state.warmupSeconds);
  const setWarmupSeconds = useTrackerStore((state) => state.setWarmupSeconds);
  const warmupRestSeconds = useTrackerStore((state) => state.warmupRestSeconds);
  const setWarmupRestSeconds = useTrackerStore((state) => state.setWarmupRestSeconds);
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`flex flex-col ${align === "center" ? "items-center" : "items-start"} ${className}`}
    >
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-3 self-stretch rounded-card border border-line bg-surface-raised p-3"
        >
          <DurationPicker
            legend="Durée de l'échauffement"
            value={warmupSeconds}
            presets={WARMUPS}
            max={MAX_WARMUP_SECONDS}
            onChange={setWarmupSeconds}
          />
          <DurationPicker
            legend="Repos ensuite, avant la première série"
            value={warmupRestSeconds}
            presets={RESTS_AFTER}
            max={MAX_REST_SECONDS}
            zeroLabel="Aucun"
            onChange={setWarmupRestSeconds}
            hint="Rien n'est enregistré : l'échauffement ne compte pas dans ta séance."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-card border border-line py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={warmupSeconds <= 0}
              onClick={() => {
                setOpen(false);
                onStart(warmupSeconds);
              }}
              className="flex-[2] rounded-card bg-accent py-2 text-sm font-bold text-accent-ink transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lancer · {formatDuration(warmupSeconds)}
              {warmupRestSeconds > 0 ? ` + ${formatDuration(warmupRestSeconds)}` : ""}
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-pill border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          S&apos;échauffer
        </button>
      )}
    </div>
  );
}
