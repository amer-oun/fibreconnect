/**
 * Sign-in failure codes, shared by both sides.
 *
 * NextAuth only hands the browser the *message* of the error thrown inside
 * `authorize()`, so server and client have to agree on a small vocabulary.
 *
 * This file deliberately imports nothing: the login form is a client
 * component, and reading these codes straight out of `lib/auth.ts` would drag
 * Prisma and bcrypt into the browser bundle.
 */

/** Le compte existe mais a été désactivé (règle métier 6). */
export const ERREUR_COMPTE_DESACTIVE = "COMPTE_DESACTIVE";

/**
 * Trop d'échecs consécutifs. Le nombre de secondes à attendre est collé
 * derrière, séparé par « : » — d'où `TROP_DE_TENTATIVES:840`.
 */
export const ERREUR_TROP_DE_TENTATIVES = "TROP_DE_TENTATIVES";

/** « 15 minutes », « 1 minute », « 30 secondes ». */
export function formaterAttente(secondes: number): string {
  if (secondes < 60) return `${secondes} secondes`;
  const minutes = Math.ceil(secondes / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * Traduit le code renvoyé par NextAuth en phrase affichable.
 *
 * Le cas par défaut reste volontairement vague : dire « cette adresse n'existe
 * pas » révélerait quels comptes sont ouverts.
 */
export function messageDErreurConnexion(code: string): string {
  if (code === ERREUR_COMPTE_DESACTIVE) {
    return "Ce compte a été désactivé. Contactez votre superviseur.";
  }

  if (code.startsWith(`${ERREUR_TROP_DE_TENTATIVES}:`)) {
    const secondes = Number(code.split(":")[1]);
    // Repli sur la durée nominale si le nombre est illisible : mieux vaut une
    // durée approximative qu'un « NaN » à l'écran.
    const attente = formaterAttente(Number.isFinite(secondes) ? secondes : 900);
    return `Trop de tentatives de connexion. Réessayez dans ${attente}.`;
  }

  return "Adresse e-mail ou mot de passe incorrect.";
}
