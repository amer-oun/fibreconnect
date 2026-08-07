import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { profilClientSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * The subscriber updates their own contact details.
 *
 * Contract number and operator are deliberately not editable here: they come
 * from the contract itself, and changing them would silently move the line to
 * another network's technicians.
 */
export async function PATCH(requete: Request) {
  try {
    const utilisateur = await exigerRoleApi("CLIENT");
    const donnees = profilClientSchema.parse(await lireCorps(requete));

    const client = await prisma.client.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!client) {
      throw new ErreurMetier("Profil client introuvable.", 404);
    }

    await prisma.$transaction([
      prisma.client.update({
        where: { id: client.id },
        data: {
          adresse: donnees.adresse,
          ville: donnees.ville,
          zone: donnees.zone,
        },
      }),
      prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: {
          prenom: donnees.prenom,
          nom: donnees.nom,
          telephone: donnees.telephone,
        },
      }),
    ]);

    return reponseOk({ id: client.id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
