"use client";

interface WarmupLauncherProps {
  onStart: () => void;
  align?: "start" | "center";
  className?: string;
}

/** Discret tant qu'on n'en a pas besoin : un tap, et l'échauffement commence. */
export function WarmupLauncher({ onStart, align = "start", className = "" }: WarmupLauncherProps) {
  return (
    <div
      className={`flex flex-col ${align === "center" ? "items-center" : "items-start"} ${className}`}
    >
      <button
        type="button"
        onClick={onStart}
        className="rounded-pill border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
      >
        S&apos;échauffer
      </button>
    </div>
  );
}
