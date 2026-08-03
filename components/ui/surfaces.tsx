import type { ReactNode } from "react";

/**
 * Flat surfaces with hairline borders — no rounded card with a drop shadow
 * anywhere in this project. Depth comes from the border and the background
 * step (white on ivoire), not from a shadow.
 */

export function Panneau({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  /** Arete gauche cyan : reserve a l'element actif ou mis en avant. */
  accent?: boolean;
}) {
  return (
    <section
      className={`rounded-bloc border border-trait bg-white ${
        accent ? "border-l-2 border-l-signal" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function TitrePanneau({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-trait px-4 py-3 sm:px-5">
      <h2 className="font-display text-sm font-semibold tracking-tight text-nuit">
        {children}
      </h2>
      {actions}
    </div>
  );
}

export function EntetePage({
  surtitre,
  titre,
  description,
  actions,
}: {
  surtitre?: ReactNode;
  titre: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-trait pb-5">
      <div className="min-w-0">
        {surtitre && <p className="eyebrow mb-1.5">{surtitre}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-nuit sm:text-[1.75rem]">
          {titre}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-ardoise">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Un ecran vide dit quoi faire ensuite, il ne se contente pas de constater
 * l'absence de donnees.
 */
export function EtatVide({
  titre,
  message,
  action,
}: {
  titre: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <svg
        aria-hidden
        viewBox="0 0 120 40"
        className="mb-5 h-10 w-28 text-trait"
        fill="none"
      >
        <path
          d="M0 20h34"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M86 20h34"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <circle cx="44" cy="20" r="3" fill="currentColor" />
        <circle cx="60" cy="20" r="3" fill="currentColor" />
        <circle cx="76" cy="20" r="3" fill="currentColor" />
      </svg>
      <h3 className="font-display text-base font-semibold text-nuit">{titre}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ardoise">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Chiffre-cle : une valeur, son libelle, et rien d'autre. */
export function Indicateur({
  libelle,
  valeur,
  precision,
  accent,
}: {
  libelle: string;
  valeur: string | number;
  precision?: string;
  accent?: string;
}) {
  return (
    <div className="border-l-2 py-1 pl-4" style={{ borderColor: accent ?? "#dbe2ec" }}>
      <p className="eyebrow">{libelle}</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-nuit tabulaire">
        {valeur}
      </p>
      {precision && <p className="mt-0.5 text-xs text-ardoise">{precision}</p>}
    </div>
  );
}

/* Squelettes de chargement ------------------------------------------------ */

export function Squelette({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-net bg-trait/70 ${className}`}
    />
  );
}

export function SqueletteTableau({ lignes = 5 }: { lignes?: number }) {
  return (
    <div className="divide-y divide-trait">
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Squelette className="h-4 w-16" />
          <Squelette className="h-4 flex-1" />
          <Squelette className="hidden h-5 w-24 sm:block" />
          <Squelette className="hidden h-4 w-28 md:block" />
        </div>
      ))}
    </div>
  );
}

export function SquelettePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Squelette className="h-3 w-24" />
      <Squelette className="mt-3 h-8 w-72" />
      <Squelette className="mt-3 h-4 w-96" />
      <div className="mt-8 rounded-bloc border border-trait bg-white">
        <SqueletteTableau />
      </div>
    </div>
  );
}
