"use client";

import { AnimatePresence, motion } from "motion/react";

interface CollapsibleProps {
  title: string;
  /** Aperçu affiché replié : il évite d'ouvrir pour savoir ce qu'il y a dedans. */
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function Collapsible({ title, summary, open, onToggle, children }: CollapsibleProps) {
  return (
    <section className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
      >
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          className="shrink-0 text-ink-faint"
        >
          ›
        </motion.span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {summary && !open ? (
            <span className="block truncate text-xs text-ink-faint">{summary}</span>
          ) : null}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 py-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
