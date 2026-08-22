"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { Celebration, type CelebrationPayload } from "@/components/Celebration";
import { ExerciseCard } from "@/components/ExerciseCard";
import { GroupFilter, type GroupFilterValue } from "@/components/GroupFilter";
import { StatsBanner } from "@/components/StatsBanner";
import { UpdateSheet } from "@/components/UpdateSheet";
import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import { downloadSnapshot, parseSnapshot } from "@/lib/backup";
import { countActiveDays, summarize } from "@/lib/progress";
import { useHydrated, useTrackerStore } from "@/store/tracker-store";
import type { Exercise, MuscleGroupId } from "@/lib/types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function Dashboard() {
  const exercises = useTrackerStore((state) => state.exercises);
  const trackings = useTrackerStore((state) => state.trackings);
  const replaceAll = useTrackerStore((state) => state.replaceAll);
  const hydrated = useHydrated();

  const [filter, setFilter] = useState<GroupFilterValue>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trackingList = useMemo(() => Object.values(trackings), [trackings]);
  const summary = useMemo(() => summarize(exercises, trackingList), [exercises, trackingList]);
  const activeDays = useMemo(() => countActiveDays(trackingList), [trackingList]);

  const counts = useMemo(() => {
    const initial = Object.fromEntries(
      MUSCLE_GROUPS.map((group) => [group.id, 0]),
    ) as Record<MuscleGroupId, number>;

    return exercises.reduce((acc, exercise) => {
      acc[exercise.group] += 1;
      return acc;
    }, initial);
  }, [exercises]);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());

    return exercises.filter((exercise) => {
      const matchesGroup = filter === "all" || exercise.group === filter;
      const matchesQuery = needle.length === 0 || normalize(exercise.name).includes(needle);
      return matchesGroup && matchesQuery;
    });
  }, [exercises, filter, query]);

  const sections = useMemo(() => {
    return MUSCLE_GROUPS.map((group) => ({
      group,
      items: visible.filter((exercise) => exercise.group === group.id),
    })).filter((section) => section.items.length > 0);
  }, [visible]);

  const selected: Exercise | null =
    exercises.find((exercise) => exercise.id === selectedId) ?? null;

  const handleImport = async (file: File) => {
    try {
      replaceAll(parseSnapshot(await file.text()));
      setNotice("Sauvegarde importée");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import impossible");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      window.setTimeout(() => setNotice(null), 4000);
    }
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
            Tes charges,{" "}
            <span className="text-accent">
              {summary.improvedCount > 0 ? "en hausse" : "sous contrôle"}
            </span>
          </h1>
          <p className="text-sm text-ink-muted">
            Note ta charge après chaque série et regarde la courbe monter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadSnapshot({ exercises, trackings })}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleImport(file);
              }
            }}
          />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-pill bg-accent px-4 py-2 text-xs font-bold text-accent-ink transition-transform active:scale-95"
          >
            + Exercice
          </button>
        </div>
      </header>

      <AnimatePresence>
        {notice ? (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-card border border-line bg-surface px-4 py-2 text-sm text-ink-muted"
          >
            {notice}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <StatsBanner summary={summary} activeDays={activeDays} />

      <div className="flex flex-col gap-3">
        <label className="relative flex items-center">
          <span className="sr-only">Rechercher un exercice</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un exercice…"
            className="w-full rounded-pill border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </label>

        <GroupFilter
          value={filter}
          counts={counts}
          total={exercises.length}
          onChange={setFilter}
        />
      </div>

      {!hydrated ? (
        <p className="py-16 text-center text-sm text-ink-faint">Chargement de tes données…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Aucun exercice ne correspond à ta recherche.</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-pill bg-accent px-4 py-2 text-xs font-bold text-accent-ink"
          >
            Créer cet exercice
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.group.id} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-ink-muted uppercase">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-pill"
                  style={{ backgroundColor: `var(${section.group.accent})` }}
                />
                {section.group.label}
                <span className="tabular text-xs font-medium text-ink-faint">
                  {section.items.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    tracking={trackings[exercise.id]}
                    onOpen={setSelectedId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <UpdateSheet
        exercise={selected}
        tracking={selected ? trackings[selected.id] : undefined}
        onClose={() => setSelectedId(null)}
        onCelebrate={setCelebration}
      />

      <AddExerciseDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(exerciseId) => {
          setAdding(false);
          setSelectedId(exerciseId);
        }}
      />

      <Celebration payload={celebration} onDone={() => setCelebration(null)} />
    </div>
  );
}
