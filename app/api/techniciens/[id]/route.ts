import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { statutCompteSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Activation / désactivation d'un compte technicien par le superviseur.
 * Un utilisateur `actif = false` ne peut plus se connecter (règle 6).
 */
export async function PATCH(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { actif } = statutCompteSchema.parse(await lireCorps(requete));

    const technicien = await prisma.technicien.findUnique({
      where: { id },
      select: { id: true, utilisateurId: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Ce technicien n’existe pas.", 404);
    }

    // Le superviseur peut désactiver n'importe quel compte : c'est une
    // prérogative que lui donne le cahier des charges, sans condition. On ne
    // bloque donc pas quand il reste des interventions ouvertes — on renvoie
    // leur nombre pour que l'interface le signale et qu'il puisse réaffecter.
    const enCours = await prisma.intervention.count({
      where: { technicienId: id, statut: { in: ["ASSIGNEE", "EN_COURS"] } },
    });

    await prisma.utilisateur.update({
      where: { id: technicien.utilisateurId },
      data: { actif },
    });

    return reponseOk({ id, actif, interventionsOuvertes: enCours });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
