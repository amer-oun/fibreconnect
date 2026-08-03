"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type EntreeNav = {
  libelle: string;
  href: string;
  /** Court, pour la barre mobile. */
  abrege: string;
  icone: "liste" | "ajout" | "chantier" | "archive" | "profil" | "equipe" | "carte" | "stats";
};

const ICONES: Record<EntreeNav["icone"], React.ReactNode> = {
  liste: <path d="M3 5h14M3 10h14M3 15h9" />,
  ajout: <path d="M10 4v12M4 10h12" />,
  chantier: <path d="M4 16l5-5 3 3 4-6M4 4v12h12" />,
  archive: <path d="M3 6h14v10H3zM3 6l1-2h12l1 2M8 10h4" />,
  profil: <path d="M10 10a3 3 0 100-6 3 3 0 000 6zM4 17c0-3 2.7-5 6-5s6 2 6 5" />,
  equipe: <path d="M7 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2 16c0-2.5 2.2-4 5-4s5 1.5 5 4M14 7h4M14 11h4M14 15h4" />,
  carte: <path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2zM7 3v12M13 5v12" />,
  stats: <path d="M3 17V9M8 17V4M13 17v-6M18 17v-9" />,
};

function Icone({ nom }: { nom: EntreeNav["icone"] }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONES[nom]}
    </svg>
  );
}

function estActif(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Entree de la barre laterale (ecran large). */
export function LienLateral({ entree }: { entree: EntreeNav }) {
  const pathname = usePathname();
  const actif = estActif(pathname, entree.href);

  return (
    <Link
      href={entree.href}
      aria-current={actif ? "page" : undefined}
      className={`flex items-center gap-3 border-l-2 py-2.5 pr-3 pl-4 text-sm transition-colors duration-150 ${
        actif
          ? "border-l-signal bg-nuit-800 font-medium text-ivoire"
          : "border-l-transparent text-brume hover:border-l-nuit-600 hover:bg-nuit-800/60 hover:text-ivoire"
      }`}
    >
      <Icone nom={entree.icone} />
      {entree.libelle}
    </Link>
  );
}

/** Entree de la barre du bas (telephone). */
export function LienMobile({ entree }: { entree: EntreeNav }) {
  const pathname = usePathname();
  const actif = estActif(pathname, entree.href);

  return (
    <Link
      href={entree.href}
      aria-current={actif ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 border-t-2 px-1 py-2 text-[0.6875rem] transition-colors duration-150 ${
        actif
          ? "border-t-signal text-ivoire"
          : "border-t-transparent text-brume"
      }`}
    >
      <Icone nom={entree.icone} />
      <span className="truncate">{entree.abrege}</span>
    </Link>
  );
}
