/**
 * CSV writing, aimed at the program that actually opens these files: Excel.
 *
 * Three details that are not optional:
 *   - a UTF-8 BOM, without which Excel mangles every accent;
 *   - semicolons, because a French Excel reads a comma-separated file as one
 *     single column;
 *   - formula neutralisation (see `cellule`).
 *
 * Kept apart from the route so it can be tested on its own — the escaping is
 * the part that breaks silently.
 */

/** Marque d'ordre des octets. Excel lit l'UTF-8 correctement grâce à elle. */
export const BOM = "﻿";

export const SEPARATEUR = ";";

/**
 * Prépare une valeur pour une cellule.
 *
 * Une valeur commençant par `=`, `+`, `-` ou `@` est interprétée comme une
 * **formule** par Excel et LibreOffice : un abonné qui s'appellerait `=1+1`
 * verrait sa cellule calculée, et une formule bien choisie peut lire d'autres
 * cellules ou déclencher une ouverture de fichier. On préfixe donc ces valeurs
 * d'une apostrophe, qui force le mode texte.
 *
 * Tout est ensuite entouré de guillemets, les guillemets internes doublés :
 * c'est ce qui permet à un rapport contenant un point-virgule ou un saut de
 * ligne de rester dans une seule colonne.
 */
export function cellule(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined) return "";

  let texte = String(valeur);
  if (/^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`;

  return `"${texte.replace(/"/g, '""')}"`;
}

/** Assemble les lignes en un document complet, prêt à être renvoyé. */
export function construireCsv(
  entetes: string[],
  lignes: (string | number | null | undefined)[][],
): string {
  const corps = [
    entetes.map(cellule).join(SEPARATEUR),
    ...lignes.map((ligne) => ligne.map(cellule).join(SEPARATEUR)),
  ];
  // CRLF : la fin de ligne qu'attend le format CSV, et qu'Excel préfère.
  return BOM + corps.join("\r\n");
}
