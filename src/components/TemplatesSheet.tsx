"use client";

import { useRef, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { PILL_BASE, PILL_OFF, PILL_ON } from "@/components/pill-styles";
import { findCatalogEntry } from "@/data/exercise-catalog";
import {
  DAY_LAYOUTS,
  LEVEL_LABELS,
  PLACE_LABELS,
  PROGRAM_TEMPLATES,
  type ProgramTemplate,
  type TemplateDays,
  type TemplateSlot,
  type TemplateWorkout,
} from "@/data/program-templates";
import { WEEKDAYS } from "@/data/weekdays";
import { hasAvoidableBackToBack, isValidSchedule, sortWeekdays } from "@/lib/templates";
import { useTrackerStore } from "@/store/tracker-store";
import type { Program, WeekdayId } from "@/lib/types";

interface TemplatesSheetProps {
  open: boolean;
  onClose: () => void;
  onAdopted: (program: Program) => void;
}

const DAY_OPTIONS: readonly TemplateDays[] = [2, 3, 4, 5];

function prescription(slot: TemplateSlot): string {
  if (!slot.reps) {
    return `${slot.sets} séries`;
  }

  const [min, max] = slot.reps;
  return `${slot.sets} × ${min === max ? min : `${min}-${max}`}`;
}

function daysRange(template: ProgramTemplate): string {
  const days = template.variants.map((variant) => variant.days);
  return `${days.join(" · ")} j / sem.`;
}

/**
 * Séances distinctes du rythme choisi, avec les jours où chacune revient. Tant
 * que tous les jours ne sont pas choisis, les séances restantes n'en ont pas.
 */
function weekPlan(template: ProgramTemplate, days: TemplateDays, schedule: WeekdayId[]) {
  const variant = template.variants.find((item) => item.days === days);
  const plan = new Map<string, { workout: TemplateWorkout; days: string[] }>();
  const ordered = sortWeekdays(schedule);

  variant?.sessions.forEach((session, index) => {
    const weekday = WEEKDAYS.find((item) => item.id === ordered[index]);
    const entry = plan.get(session.key) ?? { workout: session, days: [] };
    if (weekday) {
      entry.days.push(weekday.label);
    }
    plan.set(session.key, entry);
  });

  return [...plan.values()];
}

/**
 * On choisit d'abord un objectif, puis son rythme. Le filtre par nombre de
 * jours va dans l'autre sens, pour qui sait déjà combien de fois il viendra.
 */
export function TemplatesSheet({ open, onClose, onAdopted }: TemplatesSheetProps) {
  const exercises = useTrackerStore((state) => state.exercises);
  const adoptTemplate = useTrackerStore((state) => state.adoptTemplate);

  const [filter, setFilter] = useState<TemplateDays | null>(null);
  const [selected, setSelected] = useState<ProgramTemplate | null>(null);
  const [days, setDays] = useState<TemplateDays>(2);
  const [schedule, setSchedule] = useState<WeekdayId[]>([...DAY_LAYOUTS[2]]);
  const topRef = useRef<HTMLDivElement>(null);

  const owned = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const nameOf = (id: string) => owned.get(id)?.name ?? findCatalogEntry(id)?.name ?? id;

  const visible = filter
    ? PROGRAM_TEMPLATES.filter((template) =>
        template.variants.some((variant) => variant.days === filter),
      )
    : PROGRAM_TEMPLATES;

  /** Changer de rythme repart de la répartition conseillée pour ce rythme. */
  const chooseDays = (next: TemplateDays) => {
    setDays(next);
    setSchedule([...DAY_LAYOUTS[next]]);
  };

  const toggleDay = (day: WeekdayId) => {
    setSchedule((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const openTemplate = (template: ProgramTemplate) => {
    const preferred = template.variants.find((variant) => variant.days === filter);
    chooseDays(preferred?.days ?? template.variants[0]!.days);
    setSelected(template);
    topRef.current?.scrollIntoView?.({ block: "start" });
  };

  const close = () => {
    onClose();
    setSelected(null);
  };

  const plan = selected ? weekPlan(selected, days, schedule) : [];
  const scheduleReady = isValidSchedule(schedule, days);
  const missing = days - schedule.length;
  const added = new Set(
    plan.flatMap(({ workout }) =>
      workout.slots.map((slot) => slot.exerciseId).filter((id) => !owned.has(id)),
    ),
  ).size;

  return (
    <Sheet open={open} title="Programmes tout prêts" onClose={close}>
      <div ref={topRef} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">
            {selected ? selected.name : "Programmes tout prêts"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {selected
              ? selected.goal
              : "Choisis un objectif, puis ton rythme. Tu pourras tout modifier ensuite."}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Fermer
        </button>
      </div>

      {selected ? (
        <div className="mt-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="self-start text-xs font-semibold text-ink-muted underline-offset-4 hover:text-accent hover:underline"
          >
            ‹ Tous les programmes
          </button>

          <p className="text-sm leading-relaxed text-ink-muted">{selected.description}</p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-ink-muted">Jours par semaine</legend>
            <div className="flex flex-wrap gap-2">
              {selected.variants.map((variant) => (
                <button
                  key={variant.days}
                  type="button"
                  aria-pressed={variant.days === days}
                  onClick={() => chooseDays(variant.days)}
                  className={`${PILL_BASE} ${variant.days === days ? PILL_ON : PILL_OFF}`}
                >
                  {variant.days} jours
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-ink-muted">
              Jours d&apos;entraînement
            </legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((weekday) => {
                const on = schedule.includes(weekday.id);

                return (
                  <button
                    key={weekday.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={weekday.label}
                    title={weekday.label}
                    onClick={() => toggleDay(weekday.id)}
                    className={`flex aspect-square items-center justify-center rounded-pill border text-sm font-bold transition-colors ${
                      on
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line bg-surface-raised text-ink-muted hover:text-ink"
                    }`}
                  >
                    {weekday.letter}
                  </button>
                );
              })}
            </div>
            <p
              aria-live="polite"
              className={`text-xs ${scheduleReady ? "text-ink-faint" : "text-accent"}`}
            >
              {missing > 0
                ? `Choisis encore ${missing} jour${missing > 1 ? "s" : ""}.`
                : missing < 0
                  ? `Retire ${-missing} jour${missing < -1 ? "s" : ""} : ce rythme compte ${days} séances.`
                  : hasAvoidableBackToBack(schedule)
                    ? "Deux séances d'affilée : un jour de repos entre les deux aide à récupérer."
                    : "Les séances se suivent dans l'ordre de la semaine."}
            </p>
          </fieldset>

          <ul className="flex flex-col gap-2">
            {plan.map(({ workout, days: on }) => (
              <li
                key={workout.key}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface-raised p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-bold text-ink">{workout.name}</h3>
                  <span className="text-xs text-accent">
                    {on.length > 0 ? on.join(", ") : "Jour à choisir"}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {workout.slots.map((slot) => (
                    <li
                      key={slot.exerciseId}
                      className="flex items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="min-w-0 truncate text-ink-muted">
                        {nameOf(slot.exerciseId)}
                      </span>
                      <span className="tabular shrink-0 text-ink-faint">
                        {prescription(slot)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!scheduleReady}
              onClick={() => {
                const program = adoptTemplate(selected.id, days, schedule);
                if (program) {
                  close();
                  onAdopted(program);
                }
              }}
              className="w-full rounded-card bg-accent px-4 py-3.5 text-base font-bold text-accent-ink transition-transform hover:bg-accent-strong active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivre ce programme
            </button>
            <p className="text-center text-xs text-ink-faint">
              {added === 0
                ? "Tous ces exercices sont déjà dans ta bibliothèque."
                : added === 1
                  ? "1 nouvel exercice rejoindra ta bibliothèque."
                  : `${added} nouveaux exercices rejoindront ta bibliothèque.`}{" "}
              Tes réglages et ton historique restent intacts.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-ink-muted">Jours par semaine</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={filter === null}
                onClick={() => setFilter(null)}
                className={`${PILL_BASE} ${filter === null ? PILL_ON : PILL_OFF}`}
              >
                Tous
              </button>
              {DAY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={`${PILL_BASE} ${filter === option ? PILL_ON : PILL_OFF}`}
                >
                  {option} jours
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="flex flex-col gap-2">
            {visible.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => openTemplate(template)}
                  className="flex w-full items-center gap-3 rounded-card border border-line bg-surface-raised px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-bold text-ink">{template.name}</span>
                    <span className="text-xs text-ink-muted">{template.goal}</span>
                    <span className="flex flex-wrap gap-x-2 text-xs text-ink-faint">
                      <span>{LEVEL_LABELS[template.level]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{PLACE_LABELS[template.place]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{daysRange(template)}</span>
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-ink-faint">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
