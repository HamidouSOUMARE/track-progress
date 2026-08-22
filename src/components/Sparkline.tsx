interface SparklineProps {
  values: number[];
  /** Couleur de tracé (token CSS du groupe musculaire). */
  color: string;
  className?: string;
}

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 32;
const PADDING = 3;

function toPoints(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const usableHeight = VIEWBOX_HEIGHT - PADDING * 2;
  const step = values.length > 1 ? VIEWBOX_WIDTH / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      // Série plate : on la centre plutôt que de la coller en haut.
      const ratio = span === 0 ? 0.5 : (value - min) / span;
      const y = VIEWBOX_HEIGHT - PADDING - ratio * usableHeight;
      return `${(index * step).toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({ values, color, className }: SparklineProps) {
  const points = toPoints(values);
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${VIEWBOX_HEIGHT} ${points} ${VIEWBOX_WIDTH},${VIEWBOX_HEIGHT}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
