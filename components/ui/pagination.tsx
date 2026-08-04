import Link from "next/link";

import type { ParametresRecherche } from "@/lib/filtres";
import { lienPage, type Pagination as EtatPagination } from "@/lib/pagination";

/**
 * Page navigation for a server-rendered list.
 *
 * Plain links, no client component: the whole point of keeping the page number
 * in the URL is that the browser can do the work. Middle-click opens page 3 in
 * a new tab, and the printed version drops the control entirely.
 */

/**
 * Numéros à afficher : les extrémités, plus une fenêtre autour de la page
 * courante. `null` marque une coupure (« … »).
 */
function fenetre(page: number, pages: number): (number | null)[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }

  const numeros = new Set([1, pages, page, page - 1, page + 1]);
  // Toujours trois chiffres visibles aux extrémités, sinon la barre « saute »
  // de largeur quand on approche du début ou de la fin.
  if (page <= 3) [2, 3, 4].forEach((n) => numeros.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => numeros.add(n));

  const tries = [...numeros].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  const avecCoupures: (number | null)[] = [];
  let precedent = 0;
  for (const numero of tries) {
    if (precedent && numero - precedent > 1) avecCoupures.push(null);
    avecCoupures.push(numero);
    precedent = numero;
  }
  return avecCoupures;
}

const BASE_CASE =
  "inline-flex min-w-9 items-center justify-center rounded-net border px-2.5 py-1.5 text-sm transition-colors";

export default function Pagination({
  chemin,
  parametres,
  etat,
  nom,
}: {
  chemin: string;
  parametres: ParametresRecherche;
  etat: EtatPagination;
  /** Ce qu'on compte : « interventions », « clients »… */
  nom: string;
}) {
  const { page, pages, total, premier, dernier } = etat;

  if (total === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className="sans-impression mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-ardoise tabulaire">
        <span className="font-medium text-nuit">
          {premier}–{dernier}
        </span>{" "}
        sur {total} {nom}
      </p>

      {pages > 1 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          <li>
            {page > 1 ? (
              <Link
                href={lienPage(chemin, parametres, page - 1)}
                rel="prev"
                className={`${BASE_CASE} border-trait text-nuit hover:border-ardoise`}
              >
                Précédent
              </Link>
            ) : (
              <span className={`${BASE_CASE} border-transparent text-brume`}>
                Précédent
              </span>
            )}
          </li>

          {fenetre(page, pages).map((numero, index) =>
            numero === null ? (
              <li key={`coupure-${index}`} aria-hidden className="px-1 text-brume">
                …
              </li>
            ) : (
              <li key={numero}>
                {numero === page ? (
                  <span
                    aria-current="page"
                    className={`${BASE_CASE} border-signal-profond bg-ivoire font-semibold text-nuit`}
                  >
                    {numero}
                  </span>
                ) : (
                  <Link
                    href={lienPage(chemin, parametres, numero)}
                    aria-label={`Page ${numero}`}
                    className={`${BASE_CASE} border-trait text-ardoise hover:border-ardoise hover:text-nuit`}
                  >
                    {numero}
                  </Link>
                )}
              </li>
            ),
          )}

          <li>
            {page < pages ? (
              <Link
                href={lienPage(chemin, parametres, page + 1)}
                rel="next"
                className={`${BASE_CASE} border-trait text-nuit hover:border-ardoise`}
              >
                Suivant
              </Link>
            ) : (
              <span className={`${BASE_CASE} border-transparent text-brume`}>
                Suivant
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
