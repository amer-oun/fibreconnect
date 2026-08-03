"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * Filters live in the URL, not in component state.
 *
 * That keeps every list a server-rendered page, makes a filtered view
 * shareable and bookmarkable, and means the back button behaves.
 */

export type DefinitionFiltre = {
  cle: string;
  label: string;
  options: ReadonlyArray<{ valeur: string; libelle: string }>;
};

export default function BarreFiltres({
  placeholderRecherche = "Rechercher…",
  filtres,
}: {
  placeholderRecherche?: string;
  filtres: DefinitionFiltre[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const parametres = useSearchParams();
  const [enAttente, demarrerTransition] = useTransition();

  const qUrl = parametres.get("q") ?? "";
  const [recherche, setRecherche] = useState(qUrl);
  const [qConnu, setQConnu] = useState(qUrl);

  // L'URL peut changer sans passer par le champ (retour arriere, lien direct).
  // On resynchronise pendant le rendu plutot que dans un effet : pas de rendu
  // en cascade, et le champ reste aligne sur l'URL.
  if (qUrl !== qConnu) {
    setQConnu(qUrl);
    setRecherche(qUrl);
  }

  function appliquer(cle: string, valeur: string) {
    const suivants = new URLSearchParams(parametres.toString());
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);

    demarrerTransition(() => {
      router.replace(`${pathname}?${suivants.toString()}`, { scroll: false });
    });
  }

  // Le champ texte attend une pause de frappe avant de relancer la requete.
  useEffect(() => {



    if (recherche.trim() === qUrl) return;
    const minuteur = setTimeout(() => appliquer("q", recherche.trim()), 300);
    return () => clearTimeout(minuteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  const actifs = filtres.filter((f) => parametres.get(f.cle));
  const aDesFiltres = actifs.length > 0 || (parametres.get("q") ?? "") !== "";

  return (
    <div
      className={`sans-impression flex flex-wrap items-end gap-3 border-b border-trait px-4 py-3 transition-opacity sm:px-5 ${
        enAttente ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="recherche" className="sr-only">
          Rechercher
        </label>
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brume"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13 13l4 4" strokeLinecap="round" />
          </svg>
          <input
            id="recherche"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={placeholderRecherche}
            className="w-full rounded-net border border-trait bg-white py-2 pr-3 pl-9 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
          />
        </div>
      </div>

      {filtres.map((filtre) => {
        const valeur = parametres.get(filtre.cle) ?? "";
        return (
          <div key={filtre.cle}>
            <label
              htmlFor={`filtre-${filtre.cle}`}
              className="sr-only"
            >
              {filtre.label}
            </label>
            <select
              id={`filtre-${filtre.cle}`}
              value={valeur}
              onChange={(e) => appliquer(filtre.cle, e.target.value)}
              className={`rounded-net border bg-white px-2.5 py-2 text-sm focus:border-signal focus:outline-none ${
                valeur
                  ? "border-signal-profond font-medium text-nuit"
                  : "border-trait text-ardoise"
              }`}
            >
              <option value="">{filtre.label} : tous</option>
              {filtre.options.map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.libelle}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {aDesFiltres && (
        <button
          type="button"
          onClick={() => demarrerTransition(() => router.replace(pathname))}
          className="rounded-net px-2 py-2 text-sm text-ardoise underline decoration-trait underline-offset-4 hover:text-nuit hover:decoration-ardoise"
        >
          Tout effacer
        </button>
      )}
    </div>
  );
}
