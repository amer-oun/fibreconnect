import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { ErreurMetier } from "@/lib/interventions";

/**
 * Forgotten passwords.
 *
 * Until this existed, a subscriber who forgot their password was locked out
 * for good: the change-password route requires the current one, and the
 * supervisor can only set a password when creating a technician. The only
 * remedy was to open Prisma Studio.
 *
 * Three properties decide whether a reset link is safe, and each is enforced
 * here rather than left to the caller:
 *
 *  1. **The token is never stored.** Only its SHA-256 fingerprint is. A stolen
 *     database, or a backup file left on a laptop, must not hand over working
 *     reset links — the same reasoning that puts bcrypt on the password field.
 *     SHA-256 rather than bcrypt because the token is 32 random bytes: there is
 *     nothing to guess, and a deliberately slow hash only protects secrets a
 *     human chose.
 *  2. **It expires**, in one hour. A mailbox read six months later on a shared
 *     computer must not still open the account.
 *  3. **It works once.** Consumption is a conditional `updateMany`, the same
 *     pattern the project uses for concurrent acceptance: two simultaneous
 *     submissions of one link cannot both succeed.
 *
 * What this module deliberately does not do is tell anyone whether an address
 * has an account. `demanderReinitialisation` returns `null` for an unknown or
 * unusable account, and the route answers exactly the same thing either way —
 * otherwise the form becomes a way to enumerate the company's subscribers.
 */

/** Durée de validité d'un lien, en minutes. */
export const DUREE_JETON_MINUTES = 60;

/** L'empreinte stockée en base. Jamais le jeton lui-même. */
export function empreinteDe(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

/**
 * 32 octets tirés au sort, en base64url pour tenir dans une URL sans
 * échappement. C'est le secret qui part par courriel, et il n'existe qu'une
 * fois : personne, pas même le superviseur, ne peut le relire ensuite.
 */
function tirerJeton(): string {
  return randomBytes(32).toString("base64url");
}

export type DemandeAcceptee = {
  jeton: string;
  courriel: string;
  prenom: string;
  nom: string;
};

/**
 * Ouvre une demande de réinitialisation, ou ne fait rien.
 *
 * Renvoie `null` quand l'adresse est inconnue **ou** quand le compte ne peut
 * de toute façon pas se connecter (`EN_ATTENTE`, `DESACTIVE`) : envoyer un
 * lien à un compte désactivé promettrait un accès qui serait refusé au bout.
 *
 * Une demande écrase la précédente : le dernier lien reçu est le seul valable,
 * ce qui est aussi ce que l'utilisateur attend quand il clique deux fois.
 */
export async function demanderReinitialisation(
  email: string,
  maintenant = new Date(),
): Promise<DemandeAcceptee | null> {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      statutCompte: true,
    },
  });

  if (!utilisateur || utilisateur.statutCompte !== "ACTIF") return null;

  const jeton = tirerJeton();

  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: {
      jetonReset: empreinteDe(jeton),
      jetonResetExpire: new Date(
        maintenant.getTime() + DUREE_JETON_MINUTES * 60_000,
      ),
    },
  });

  return {
    jeton,
    courriel: utilisateur.email,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
  };
}

/** Le compte visé par un lien encore valable, ou `null`. */
export async function compteDuJeton(jeton: string, maintenant = new Date()) {
  if (!jeton) return null;

  return prisma.utilisateur.findFirst({
    where: {
      jetonReset: empreinteDe(jeton),
      jetonResetExpire: { gt: maintenant },
    },
    select: { id: true, email: true, prenom: true },
  });
}

/**
 * Consomme le lien et pose le nouveau mot de passe.
 *
 * La condition d'expiration est portée par l'écriture elle-même, pas par une
 * lecture faite juste avant : entre lire et écrire, un lien peut expirer, et
 * une seconde soumission de la même page ne doit pas passer parce que la
 * première venait de vérifier.
 */
export async function reinitialiserMotDePasse(
  jeton: string,
  nouveauMotDePasse: string,
  maintenant = new Date(),
): Promise<{ email: string }> {
  const empreinte = empreinteDe(jeton);

  // Lecture d'abord, uniquement pour connaître l'adresse : elle sert à lever
  // le blocage des tentatives de connexion, plus bas dans la route.
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { jetonReset: empreinte },
    select: { id: true, email: true },
  });

  const { count } = utilisateur
    ? await prisma.utilisateur.updateMany({
        where: {
          id: utilisateur.id,
          jetonReset: empreinte,
          jetonResetExpire: { gt: maintenant },
        },
        data: {
          motDePasse: await bcrypt.hash(nouveauMotDePasse, BCRYPT_ROUNDS),
          jetonReset: null,
          jetonResetExpire: null,
        },
      })
    : { count: 0 };

  if (count === 0) {
    // Un seul message pour « inconnu », « expiré » et « déjà utilisé ». Les
    // distinguer apprendrait à qui essaie un lien au hasard s'il a existé.
    throw new ErreurMetier(
      "Ce lien de réinitialisation n’est plus valable. Demandez-en un nouveau.",
      400,
    );
  }

  return { email: utilisateur!.email };
}
