import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ErreurMetier } from "@/lib/interventions";
import { premiereErreur } from "@/lib/validations";
import { utilisateurConnecte } from "@/lib/session";
import type { Role } from "@/lib/constants";

/**
 * Shared plumbing for the route handlers.
 *
 * Every response is `{ data }` or `{ error }` with a French message, and every
 * handler re-checks the role server-side: the proxy filters by URL, which is
 * not enough to stop a direct call to an endpoint.
 */

export function reponseOk<T>(data: T, statut = 200) {
  return NextResponse.json({ data }, { status: statut });
}

export function reponseErreur(message: string, statut = 400) {
  return NextResponse.json({ error: message }, { status: statut });
}

/** Lit le corps JSON sans faire planter la route s'il est absent ou invalide. */
export async function lireCorps(requete: Request): Promise<unknown> {
  try {
    return await requete.json();
  } catch {
    return {};
  }
}

/**
 * Convertit les erreurs connues en reponse HTTP. Toute autre erreur est
 * journalisee cote serveur et renvoyee en message generique : jamais de
 * detail technique dans le navigateur.
 */
export function traiterErreur(erreur: unknown) {
  if (erreur instanceof ErreurMetier) {
    return reponseErreur(erreur.message, erreur.code);
  }
  if (erreur instanceof ZodError) {
    return reponseErreur(premiereErreur(erreur), 422);
  }
  console.error("Erreur inattendue dans une route API :", erreur);
  return reponseErreur(
    "Une erreur est survenue. Réessayez dans un instant.",
    500,
  );
}

/** Exige une session avec le role attendu, sinon leve une ErreurMetier. */
export async function exigerRoleApi(role: Role) {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) {
    throw new ErreurMetier("Vous devez être connecté.", 401);
  }
  if (utilisateur.role !== role) {
    throw new ErreurMetier("Vous n’avez pas accès à cette action.", 403);
  }
  return utilisateur;
}
