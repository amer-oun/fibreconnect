import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { declarerVersement } from "@/lib/facturation";
import { versementSchema } from "@/lib/validations";
import { exigerRoleApi, lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Le technicien declare remettre a la societe toutes les especes qu'il detient.
 *
 * Aucun montant dans le corps de la requete : il est calcule a partir des
 * encaissements non encore verses. Un champ libre permettrait de declarer
 * 200 DT en en gardant 400, ce qu'aucune verification ulterieure ne pourrait
 * rattraper.
 */
export async function POST(requete: Request) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const { commentaire } = versementSchema.parse(await lireCorps(requete));

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    const versement = await declarerVersement({
      technicienId: technicien.id,
      commentaire,
    });

    return reponseOk({ id: versement.id, montant: versement.montant }, 201);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
