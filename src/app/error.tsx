"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "track-progress";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Filet de sécurité : une donnée que l'app ne sait pas afficher ne doit jamais
 * enfermer l'utilisateur dans un écran mort. On propose d'abord de récupérer la
 * sauvegarde brute, la remise à zéro seulement ensuite.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const download = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "{}";
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `track-progress-recuperation-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const resetData = () => {
    localStorage.removeItem(STORAGE_KEY);
    reset();
    window.location.reload();
  };

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-5 px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-ink">L&apos;app n&apos;a pas pu s&apos;afficher</h1>
        <p className="text-sm text-ink-muted">
          Tes données sont toujours dans ce navigateur. Récupère-les d&apos;abord : le fichier
          téléchargé est réimportable une fois le problème réglé.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={download}
          className="w-full rounded-card bg-accent py-3 text-sm font-bold text-accent-ink"
        >
          Télécharger mes données
        </button>

        <button
          type="button"
          onClick={reset}
          className="w-full rounded-card border border-line py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          Réessayer
        </button>

        <button
          type="button"
          onClick={resetData}
          disabled={!saved}
          title={saved ? undefined : "Télécharge d'abord tes données"}
          className="w-full rounded-card border border-line py-3 text-sm font-semibold text-ink-faint transition-colors hover:border-negative/40 hover:text-negative disabled:cursor-not-allowed disabled:opacity-40"
        >
          Repartir de zéro
        </button>
      </div>

      <p className="text-xs text-ink-faint">
        « Repartir de zéro » efface les données de ce navigateur. Le bouton s&apos;active une fois
        la sauvegarde téléchargée.
      </p>
    </main>
  );
}
