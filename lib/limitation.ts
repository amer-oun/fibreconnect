/**
 * Sign-in attempt limiter.
 *
 * Without it, nothing stops a script from trying passwords in a loop against
 * `/login`. bcrypt's ~50 ms is the only brake, which still allows thousands of
 * guesses per hour.
 *
 * Two independent counters, because the two attacks look different:
 *   - per account, to stop someone hammering one known e-mail address;
 *   - per source address, to stop someone spraying one password across many
 *     accounts from the same machine — which the per-account counter alone
 *     would never notice.
 * Whichever trips first blocks the attempt.
 *
 * State lives in memory. Two consequences worth stating plainly: it resets when
 * the server restarts, and it is not shared between several instances. For this
 * application — one Node process next to one SQLite file — that is exactly the
 * deployment shape, so the limiter is effective. A multi-instance deployment
 * would have to move this into a shared store.
 */

type Suivi = {
  echecs: number;
  dernierEchec: number;
  /** Instant (ms) jusqu'auquel la clé est bloquée. 0 = pas de blocage. */
  bloqueJusqua: number;
};

/** Les échecs plus vieux que cette durée ne comptent plus. */
export const FENETRE_MS = 15 * 60 * 1000;

/** Durée du blocage une fois le seuil atteint. */
export const BLOCAGE_MS = 15 * 60 * 1000;

/** Échecs tolérés sur une même adresse e-mail avant blocage. */
export const MAX_PAR_COMPTE = 5;

/**
 * Échecs tolérés depuis une même adresse IP. Plus haut que le seuil par
 * compte : un foyer ou un bureau partage une seule adresse publique, et
 * plusieurs personnes peuvent s'y tromper de mot de passe le même matin.
 */
export const MAX_PAR_ADRESSE = 20;

/** Au-delà, on balaie les entrées expirées pour borner la mémoire utilisée. */
const TAILLE_AVANT_NETTOYAGE = 5_000;

// Comme pour le client Prisma : en développement Next.js réévalue les modules
// à chaque sauvegarde, et les compteurs repartiraient de zéro à chaque frappe.
const globalPourLimitation = globalThis as unknown as {
  tentativesConnexion: Map<string, Suivi> | undefined;
};

const tentatives =
  globalPourLimitation.tentativesConnexion ?? new Map<string, Suivi>();

if (process.env.NODE_ENV !== "production") {
  globalPourLimitation.tentativesConnexion = tentatives;
}

function cleCompte(email: string) {
  return `compte:${email.trim().toLowerCase()}`;
}

function cleAdresse(adresseIp: string) {
  return `ip:${adresseIp}`;
}

/** Retire les entrées dont ni le blocage ni la fenêtre d'échecs ne courent. */
function nettoyer(maintenant: number) {
  for (const [cle, suivi] of tentatives) {
    const blocageFini = suivi.bloqueJusqua <= maintenant;
    const fenetreFinie = maintenant - suivi.dernierEchec > FENETRE_MS;
    if (blocageFini && fenetreFinie) tentatives.delete(cle);
  }
}

function secondesRestantes(cle: string, maintenant: number) {
  const suivi = tentatives.get(cle);
  if (!suivi || suivi.bloqueJusqua <= maintenant) return 0;
  return Math.ceil((suivi.bloqueJusqua - maintenant) / 1000);
}

/**
 * Combien de secondes il reste à attendre, 0 si la tentative est autorisée.
 * À appeler AVANT toute vérification de mot de passe : un compte bloqué ne doit
 * même pas coûter un calcul bcrypt au serveur.
 */
export function secondesAvantNouvelleTentative(
  email: string,
  adresseIp: string,
  maintenant = Date.now(),
): number {
  return Math.max(
    secondesRestantes(cleCompte(email), maintenant),
    secondesRestantes(cleAdresse(adresseIp), maintenant),
  );
}

function compterEchec(cle: string, seuil: number, maintenant: number) {
  const suivi = tentatives.get(cle);

  // Première erreur, ou erreur isolée après une longue accalmie : on repart
  // de 1. Sans cette remise à zéro, cinq fautes de frappe étalées sur un an
  // finiraient par bloquer un utilisateur parfaitement légitime.
  if (!suivi || maintenant - suivi.dernierEchec > FENETRE_MS) {
    tentatives.set(cle, {
      echecs: 1,
      dernierEchec: maintenant,
      bloqueJusqua: 0,
    });
    return;
  }

  suivi.echecs += 1;
  suivi.dernierEchec = maintenant;

  if (suivi.echecs >= seuil) {
    suivi.bloqueJusqua = maintenant + BLOCAGE_MS;
    suivi.echecs = 0;
  }
}

/** À appeler à chaque identifiant refusé. */
export function enregistrerEchec(
  email: string,
  adresseIp: string,
  maintenant = Date.now(),
) {
  if (tentatives.size > TAILLE_AVANT_NETTOYAGE) nettoyer(maintenant);

  compterEchec(cleCompte(email), MAX_PAR_COMPTE, maintenant);
  compterEchec(cleAdresse(adresseIp), MAX_PAR_ADRESSE, maintenant);
}

/**
 * À appeler dès que le mot de passe s'est révélé correct : la personne a
 * prouvé qui elle est, ses erreurs précédentes ne doivent plus lui être
 * comptées. On efface aussi le compteur de l'adresse, sinon un bureau entier
 * resterait puni pour les fautes de frappe de la matinée.
 */
export function oublierEchecs(email: string, adresseIp: string) {
  tentatives.delete(cleCompte(email));
  tentatives.delete(cleAdresse(adresseIp));
}

/**
 * Oublie les échecs d'un seul compte, sans toucher au compteur de l'adresse.
 *
 * Appelé après une réinitialisation de mot de passe réussie : quelqu'un qui
 * vient de prouver qu'il relève ses courriels ne doit pas se voir refuser la
 * connexion pendant un quart d'heure de plus. Le compteur par adresse, lui,
 * reste debout — sinon réinitialiser un compte qu'on possède effacerait le
 * blocage d'une machine qui essaie des mots de passe partout.
 */
export function oublierEchecsDuCompte(email: string) {
  tentatives.delete(cleCompte(email));
}

/* -------------------------------------------------------------------------- */
/* Demandes de reinitialisation                                               */
/* -------------------------------------------------------------------------- */

/**
 * Le formulaire « mot de passe oublié » envoie un courriel à chaque appel.
 * Sans plafond, il devient une machine à inonder la boîte de n'importe qui.
 *
 * Compteurs distincts de ceux de la connexion : une demande de lien n'est pas
 * un échec d'authentification, et se tromper trois fois de bouton ne doit pas
 * fermer la porte d'entrée.
 */
export const MAX_DEMANDES_RESET = 3;
export const MAX_DEMANDES_RESET_PAR_ADRESSE = 10;

const cleResetCompte = (email: string) => `reset:${cleCompte(email)}`;
const cleResetAdresse = (adresseIp: string) => `reset:${cleAdresse(adresseIp)}`;

/** Secondes à attendre avant une nouvelle demande, 0 si elle est autorisée. */
export function secondesAvantNouvelleDemande(
  email: string,
  adresseIp: string,
  maintenant = Date.now(),
): number {
  return Math.max(
    secondesRestantes(cleResetCompte(email), maintenant),
    secondesRestantes(cleResetAdresse(adresseIp), maintenant),
  );
}

/** À appeler à chaque demande, qu'elle aboutisse ou non à un envoi. */
export function enregistrerDemande(
  email: string,
  adresseIp: string,
  maintenant = Date.now(),
) {
  if (tentatives.size > TAILLE_AVANT_NETTOYAGE) nettoyer(maintenant);

  compterEchec(cleResetCompte(email), MAX_DEMANDES_RESET, maintenant);
  compterEchec(cleResetAdresse(adresseIp), MAX_DEMANDES_RESET_PAR_ADRESSE, maintenant);
}

/** Remise à zéro complète — utilisée par les tests. */
export function reinitialiserLimitation() {
  tentatives.clear();
}

/**
 * Adresse d'origine de la requête.
 *
 * `x-forwarded-for` n'est digne de confiance que derrière un proxy qu'on
 * maîtrise : un client peut l'inventer. C'est acceptable ici parce que le
 * compteur par compte, lui, ne dépend pas de l'adresse — usurper cet en-tête
 * permet d'échapper au seuil par IP, jamais à celui qui protège un compte.
 */
export function adresseDeLaRequete(
  entetes: Record<string, string> | undefined,
): string {
  const transmise = entetes?.["x-forwarded-for"];
  if (transmise) return transmise.split(",")[0].trim();
  return entetes?.["x-real-ip"]?.trim() || "inconnue";
}
