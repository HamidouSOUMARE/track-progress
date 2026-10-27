"use client";

import { useId, useState } from "react";
import { PILL_BASE, PILL_OFF, PILL_ON } from "@/components/pill-styles";
import { formatDuration } from "@/lib/format";
import { clampDuration } from "@/lib/session";

interface DurationPickerProps {
  legend: string;
  /** Durée en secondes. */
  value: number;
  /** Durées courantes, proposées en un tap. */
  presets: readonly number[];
  max: number;
  onChange: (seconds: number) => void;
  /** Libellé de la durée nulle quand elle a un sens, « Aucun » pour le repos. */
  zeroLabel?: string;
  hint?: string;
}

function presetLabel(seconds: number, zeroLabel?: string): string {
  return seconds === 0 && zeroLabel ? zeroLabel : formatDuration(seconds);
}

/**
 * Les durées courantes en raccourcis, et la sienne à la main quand aucune ne
 * convient. Une durée personnalisée s'affiche alors à la place de « Autre ».
 */
export function DurationPicker({
  legend,
  value,
  presets,
  max,
  onChange,
  zeroLabel,
  hint,
}: DurationPickerProps) {
  const id = useId();
  const isCustom = !presets.includes(value);
  const [editing, setEditing] = useState(isCustom);
  // Les champs gardent la saisie brute : un champ vidé ne doit pas redevenir 0.
  const [minutes, setMinutes] = useState(String(Math.floor(value / 60)));
  const [seconds, setSeconds] = useState(String(value % 60));

  const syncFields = (total: number) => {
    setMinutes(String(Math.floor(total / 60)));
    setSeconds(String(total % 60));
  };

  const update = (nextMinutes: string, nextSeconds: string) => {
    setMinutes(nextMinutes);
    setSeconds(nextSeconds);
    onChange(clampDuration(Number(nextMinutes || 0) * 60 + Number(nextSeconds || 0), max));
  };

  const fieldClass =
    "tabular w-14 rounded-card border border-line bg-surface px-2 py-1.5 text-center text-base font-bold text-ink outline-none focus:border-accent/50";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-medium text-ink-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value === preset}
            onClick={() => {
              onChange(preset);
              setEditing(false);
            }}
            className={`${PILL_BASE} ${value === preset ? PILL_ON : PILL_OFF}`}
          >
            {presetLabel(preset, zeroLabel)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isCustom}
          aria-expanded={editing}
          aria-controls={`${id}-custom`}
          onClick={() => {
            syncFields(value);
            setEditing((open) => !open);
          }}
          className={`${PILL_BASE} ${isCustom ? PILL_ON : PILL_OFF}`}
        >
          {isCustom ? presetLabel(value, zeroLabel) : "Autre…"}
        </button>
      </div>

      {editing ? (
        <div id={`${id}-custom`} className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5">
            <input
              aria-label="Minutes"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={minutes}
              onChange={(event) => update(event.target.value.replace(/[^\d]/g, ""), seconds)}
              onBlur={() => syncFields(value)}
              className={fieldClass}
            />
            <span aria-hidden="true" className="text-xs text-ink-muted">
              min
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <input
              aria-label="Secondes"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={seconds}
              onChange={(event) => update(minutes, event.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => syncFields(value)}
              className={fieldClass}
            />
            <span aria-hidden="true" className="text-xs text-ink-muted">
              s
            </span>
          </span>
          <span className="text-xs text-ink-faint">jusqu&apos;à {formatDuration(max)}</span>
        </div>
      ) : null}

      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </fieldset>
  );
}
