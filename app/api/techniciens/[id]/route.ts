import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { statutCompteSchema, zoneTechnicienSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Le superviseur agit sur un compte technicien.
 *
 * Deux gestes distincts, deux formes de corps :
 *   - `{ statutCompte }` : valider une inscription, désactiver, réactiver ;
 *   - `{ zone }` : changer le secteur couvert.
 *
 * La zone n'est pas dans le profil que le technicien modifie lui-même : elle
 * décide quelles pannes il voit, c'est donc une décision d'affectation.
 */
export async function PATCH(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const corps = await lireCorps(requete);

    const technicien = await prisma.technicien.findUnique({
      where: { id },
      select: {
        id: true,
        utilisateurId: true,
        matricule: true,
        utilisateur: { select: { statutCompte: true } },
      },
    });
    if (!technicien) {
      throw new ErreurMetier("Ce technicien n’existe pas.", 404);
    }

    /* Changement de zone ---------------------------------------------------- */
    if (corps && typeof corps === "object" && "zone" in corps) {
      const { zone } = zoneTechnicienSchema.parse(corps);
      await prisma.technicien.update({ where: { id }, data: { zone } });
      return reponseOk({ id, zone });
    }

    /* Changement d'état du compte ------------------------------------------- */
    const { statutCompte } = statutCompteSchema.parse(corps);

    // Activer un technicien qui n'a pas de matricule reviendrait à le laisser
    // travailler sans identifiant sur ses rapports. On l'exige d'abord.
    if (statutCompte === "ACTIF" && !technicien.matricule) {
      throw new ErreurMetier(
        "Attribuez un matricule à ce technicien avant d’activer son compte.",
      );
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
      data: { statutCompte },
    });

    return reponseOk({ id, statutCompte, interventionsOuvertes: enCours });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
