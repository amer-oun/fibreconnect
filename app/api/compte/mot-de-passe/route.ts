import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { BCRYPT_ROUNDS } from "@/lib/constants";
import { ErreurMetier } from "@/lib/interventions";
import { changementMotDePasseSchema } from "@/lib/validations";
import { lireCorps, reponseOk, traiterErreur } from "@/lib/api";
import { utilisateurConnecte } from "@/lib/session";

/**
 * Password change, for any role.
 *
 * The current password is required: a stolen open session must not be enough
 * to lock the real owner out of their own account.
 */
export async function PATCH(requete: Request) {
  try {
    const session = await utilisateurConnecte();
    if (!session) {
      throw new ErreurMetier("Vous devez être connecté.", 401);
    }

    const { actuel, nouveau } = changementMotDePasseSchema.parse(
      await lireCorps(requete),
    );

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: session.id },
      select: { id: true, motDePasse: true },
    });
    if (!utilisateur) {
      throw new ErreurMetier("Compte introuvable.", 404);
    }

    const correct = await bcrypt.compare(actuel, utilisateur.motDePasse);
    if (!correct) {
      throw new ErreurMetier("Votre mot de passe actuel est incorrect.", 403);
    }

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { motDePasse: await bcrypt.hash(nouveau, BCRYPT_ROUNDS) },
    });

    return reponseOk({ modifie: true });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
