import type { ParametresRecherche } from "@/lib/filtres";

/**
 * URL-driven pagination.
 *
 * The page number lives in the query string, like the filters do, so a list
 * stays a server-rendered page: no client-side store to keep in sync, a link
 * to page 4 of a filtered view can be shared, and the back button works.
 */

/** Lignes par page. Assez pour parcourir, assez peu pour rester lisible. */
export const PAR_PAGE = 25;

/**
 * Numéro de page demandé, ramené à un entier ≥ 1.
 *
 * `?page=0`, `?page=-3` et `?page=abc` valent 1 : une URL bricolée à la main ne
 * doit jamais produire un `skip` négatif ni une erreur.
 */
export function lirePage(parametres: ParametresRecherche): number {
  const brut = parametres.page;
  const nombre = Number(typeof brut === "string" ? brut : "");
  if (!Number.isFinite(nombre)) return 1;
  return Math.max(1, Math.floor(nombre));
}

export type Pagination = {
  /** Page réellement affichée, jamais au-delà de la dernière. */
  page: number;
  pages: number;
  total: number;
  skip: number;
  take: number;
  /** Rang de la première et de la dernière ligne affichées, 1-based. */
  premier: number;
  dernier: number;
};

/**
 * Traduit un total et une page demandée en bornes de requête.
 *
 * La page est plafonnée à la dernière existante : après avoir filtré depuis la
 * page 7, on atterrit sur la dernière page du nouveau résultat plutôt que sur
 * une liste vide qui laisse croire qu'il n'y a rien.
 */
export function calculerPagination(
  total: number,
  pageDemandee: number,
  parPage = PAR_PAGE,
): Pagination {
  const pages = Math.max(1, Math.ceil(total / parPage));
  const page = Math.min(Math.max(1, pageDemandee), pages);
  const skip = (page - 1) * parPage;

  return {
    page,
    pages,
    total,
    skip,
    take: parPage,
    premier: total === 0 ? 0 : skip + 1,
    dernier: Math.min(skip + parPage, total),
  };
}

/**
 * Reconstruit l'adresse d'une page en gardant les filtres en place.
 * La page 1 n'écrit pas `?page=1` : l'adresse canonique d'une liste reste
 * la plus courte.
 */
export function lienPage(
  chemin: string,
  parametres: ParametresRecherche,
  page: number,
): string {
  const suivants = new URLSearchParams();

  for (const [cle, valeur] of Object.entries(parametres)) {
    if (cle === "page") continue;
    if (typeof valeur === "string" && valeur !== "") suivants.set(cle, valeur);
  }

  if (page > 1) suivants.set("page", String(page));

  const requete = suivants.toString();
  return requete ? `${chemin}?${requete}` : chemin;
}
