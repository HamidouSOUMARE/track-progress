import type { Unit } from "@/lib/types";

const UNIT_SUFFIX: Record<Unit, string> = {
  kg: "kg",
  rep: "reps",
  sec: "s",
  cm: "cm",
};

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

export function formatValue(value: number): string {
  return numberFormatter.format(value);
}

export function formatWithUnit(value: number, unit: Unit): string {
  return `${formatValue(value)} ${UNIT_SUFFIX[unit]}`;
}

export function unitSuffix(unit: Unit): string {
  return UNIT_SUFFIX[unit];
}

export function formatDelta(delta: number, unit: Unit): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${formatValue(Math.abs(delta))} ${UNIT_SUFFIX[unit]}`;
}

export function formatRatio(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "";
  return `${sign}${Math.round(Math.abs(ratio) * 100)} %`;
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatRelativeDate(iso: string, now = new Date()): string {
  const elapsed = new Date(iso).getTime() - now.getTime();

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return relativeFormatter.format(Math.round(elapsed / ms), unit);
    }
  }

  return "à l'instant";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
