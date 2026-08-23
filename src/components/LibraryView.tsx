"use client";

import { useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { GroupFilter, type GroupFilterValue } from "@/components/GroupFilter";
import { StatsBanner } from "@/components/StatsBanner";
import { MUSCLE_GROUPS } from "@/data/muscle-groups";
import { summarize } from "@/lib/progress";
import { normalizeText } from "@/lib/search";
import { useTrackerStore } from "@/store/tracker-store";
import type { MuscleGroupId } from "@/lib/types";

interface LibraryViewProps {
  onOpenExercise: (exerciseId: string) => void;
  onAdd: () => void;
}

export function LibraryView({ onOpenExercise, onAdd }: LibraryViewProps) {
  const exercises = useTrackerStore((state) => state.exercises);
  const trackings = useTrackerStore((state) => state.trackings);
  const setArchived = useTrackerStore((state) => state.setArchived);

  const [filter, setFilter] = useState<GroupFilterValue>("all");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const trackingList = useMemo(() => Object.values(trackings), [trackings]);
  const summary = useMemo(() => summarize(exercises, trackingList), [exercises, trackingList]);

  const active = useMemo(() => exercises.filter((item) => !item.archived), [exercises]);
  const archived = useMemo(() => exercises.filter((item) => item.archived), [exercises]);

  const counts = useMemo(() => {
    const initial = Object.fromEntries(
      MUSCLE_GROUPS.map((group) => [group.id, 0]),
    ) as Record<MuscleGroupId, number>;

    return active.reduce((acc, exercise) => {
      acc[exercise.group] += 1;
      return acc;
    }, initial);
  }, [active]);

  const visible = useMemo(() => {
    const needle = normalizeText(query.trim());

    return active.filter((exercise) => {
      const matchesGroup = filter === "all" || exercise.group === filter;
      const matchesQuery = needle.length === 0 || normalizeText(exercise.name).includes(needle);
      return matchesGroup && matchesQuery;
    });
  }, [active, filter, query]);

  const sections = useMemo(
    () =>
      MUSCLE_GROUPS.map((group) => ({
        group,
        items: visible.filter((exercise) => exercise.group === group.id),
      })).filter((section) => section.items.length > 0),
    [visible],
  );

  return (
    <div className="flex flex-col gap-6">
      <StatsBanner summary={summary} />

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

        <GroupFilter value={filter} counts={counts} total={active.length} onChange={setFilter} />
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Aucun exercice ne correspond à ta recherche.</p>
          <button
            type="button"
            onClick={onAdd}
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
                    onOpen={onOpenExercise}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <section className="rounded-card border border-line bg-surface">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            aria-expanded={showArchived}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-ink-muted">
              Masqués{" "}
              <span className="tabular text-xs text-ink-faint">({archived.length})</span>
            </span>
            <span aria-hidden="true" className="text-ink-faint">
              {showArchived ? "−" : "+"}
            </span>
          </button>

          {showArchived ? (
            <ul className="flex flex-col divide-y divide-line border-t border-line">
              {archived.map((exercise) => (
                <li key={exercise.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 truncate text-sm text-ink-muted">{exercise.name}</span>
                  <button
                    type="button"
                    onClick={() => setArchived(exercise.id, false)}
                    className="shrink-0 rounded-pill px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft"
                  >
                    Réafficher
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
