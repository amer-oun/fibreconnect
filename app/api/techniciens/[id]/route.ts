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

    if (!actif) {
      const enCours = await prisma.intervention.count({
        where: { technicienId: id, statut: { in: ["ASSIGNEE", "EN_COURS"] } },
      });
      if (enCours > 0) {
        throw new ErreurMetier(
          `Ce technicien a encore ${enCours} intervention${enCours > 1 ? "s" : ""} en cours. Réaffectez-les avant de désactiver son compte.`,
        );
      }
    }

    await prisma.utilisateur.update({
      where: { id: technicien.utilisateurId },
      data: { actif },
    });

    return reponseOk({ id, actif });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
