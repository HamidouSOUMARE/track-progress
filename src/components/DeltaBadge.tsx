import { formatDelta, formatRatio } from "@/lib/format";
import type { Unit } from "@/lib/types";

interface DeltaBadgeProps {
  delta: number;
  ratio: number;
  unit: Unit;
  showRatio?: boolean;
}

const TONES = {
  up: "bg-positive/12 text-positive",
  down: "bg-negative/12 text-negative",
  flat: "bg-surface-hover text-ink-muted",
} as const;

export function DeltaBadge({ delta, ratio, unit, showRatio = true }: DeltaBadgeProps) {
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold tabular ${TONES[tone]}`}
    >
      <span aria-hidden="true" className="text-[0.6rem]">
        {arrow}
      </span>
      {delta === 0 ? "Stable" : formatDelta(delta, unit)}
      {showRatio && delta !== 0 && ratio !== 0 ? (
        <span className="font-medium opacity-70">{formatRatio(ratio)}</span>
      ) : null}
    </span>
  );
}
