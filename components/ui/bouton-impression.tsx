"use client";

import { Bouton } from "@/components/ui/bouton";

/**
 * Print / export as PDF.
 *
 * The browser's own print dialog offers "Save as PDF" on every platform, so
 * the fiche is styled for paper with the `@media print` rules in globals.css
 * instead of pulling in a PDF library.
 */
export default function BoutonImpression({
  libelle = "Imprimer",
}: {
  libelle?: string;
}) {
  return (
    <Bouton
      variante="secondaire"
      onClick={() => window.print()}
      className="sans-impression"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8V3h8v5M6 15H4a1 1 0 01-1-1V9a1 1 0 011-1h12a1 1 0 011 1v5a1 1 0 01-1 1h-2M6 12h8v5H6z" />
      </svg>
      {libelle}
    </Bouton>
  );
}
