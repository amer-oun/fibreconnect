"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Global error boundary.
 *
 * The technical message is logged for the developer and never shown: the user
 * gets a plain sentence and the two things worth trying.
 */
export default function PageErreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur non rattrapée :", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-nuit px-5 py-12 text-center">
      <p className="eyebrow text-alerte">Interruption</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ivoire sm:text-4xl">
        Le signal s’est interrompu
      </h1>
      <p className="mt-4 max-w-md text-brume">
        Une erreur a empêché l’affichage de cette page. Réessayez : si le
        problème persiste, revenez à votre espace et signalez-le à votre
        superviseur.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-xs text-ardoise">
          Référence technique : {error.digest}
        </p>
      )}

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-net border border-signal-profond bg-signal-profond px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-nuit-700 hover:bg-nuit-700"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-net border border-trait bg-white px-5 py-2.5 text-sm font-medium text-nuit transition-colors hover:bg-ivoire"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
