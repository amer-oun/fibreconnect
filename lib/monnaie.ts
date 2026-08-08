/**
 * Money, in millimes.
 *
 * **Every amount in this application is an integer number of millimes**, never
 * a decimal number of dinars. The Tunisian dinar has three decimal places:
 * 1 DT = 1000 millimes.
 *
 * The reason is not pedantry. A `Float` cannot represent 0,1 exactly, so
 * amounts drift as soon as you add them up:
 *
 *     0.1 + 0.2 === 0.30000000000000004   // en JavaScript, aujourd'hui encore
 *
 * On one invoice nobody notices. On a monthly payroll summing two hundred
 * commissions, the total stops matching the sum of the lines shown above it —
 * and there is no way to explain that to an accountant. Integers add up
 * exactly, so a total is always the sum of what is printed.
 *
 * SQLite has no decimal type either, which would have forced the same choice.
 *
 * Rule for the rest of the codebase: a variable holding millimes is named
 * `montant…` and typed `number`; it is only turned into text at the very last
 * moment, by `formaterMontant`.
 */

/** 1 dinar = 1000 millimes. */
export const MILLIMES_PAR_DINAR = 1000;

/** `12.5` → `12500`. Utilitaire de saisie, jamais utilisé pour calculer. */
export function dinarsEnMillimes(dinars: number): number {
  return Math.round(dinars * MILLIMES_PAR_DINAR);
}

const formatDinar = new Intl.NumberFormat("fr-TN", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/**
 * `105500` → `105,500 DT`.
 *
 * Trois décimales toujours affichées : c'est l'usage du dinar, et une colonne
 * de montants dont le nombre de décimales varie ne s'aligne pas à l'œil.
 */
export function formaterMontant(millimes: number): string {
  return `${formatDinar.format(millimes / MILLIMES_PAR_DINAR)} DT`;
}

/**
 * Version courte pour les graphiques et les indicateurs, où trois décimales
 * n'apprennent rien : `105500` → `105 DT`, `1240000` → `1 240 DT`.
 */
const formatDinarEntier = new Intl.NumberFormat("fr-TN", {
  maximumFractionDigits: 0,
});

export function formaterMontantCourt(millimes: number): string {
  return `${formatDinarEntier.format(millimes / MILLIMES_PAR_DINAR)} DT`;
}

/**
 * Part d'un montant, arrondie au millime.
 *
 * Le taux est un nombre décimal (0,15 = 15 %), mais le résultat retombe
 * immédiatement sur un entier : une commission ne se traîne pas en flottant
 * jusqu'au total de la paie.
 */
export function partDe(millimes: number, taux: number): number {
  return Math.round(millimes * taux);
}
