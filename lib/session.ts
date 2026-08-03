import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { ROLE_ACCUEIL, type Role } from "@/lib/constants";

/**
 * Server-side session helpers.
 *
 * The proxy already blocks unauthenticated traffic, but it only looks at the
 * URL. Every page and every API route re-checks the role here, so a direct
 * call to an endpoint cannot bypass the rule.
 */

/** Utilisateur connecte, ou `null`. Ne redirige pas : pour les routes API. */
export async function utilisateurConnecte() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Utilisateur connecte, sinon redirection vers /login. Pour les pages. */
export async function exigerUtilisateur() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/login");
  return utilisateur;
}

/**
 * Utilisateur connecte ayant le role attendu. Un utilisateur connecte mais
 * avec le mauvais role est renvoye vers son propre espace, pas vers /login :
 * il est authentifie, simplement pas au bon endroit.
 */
export async function exigerRole(role: Role) {
  const utilisateur = await exigerUtilisateur();
  if (utilisateur.role !== role) redirect(ROLE_ACCUEIL[utilisateur.role]);
  return utilisateur;
}
