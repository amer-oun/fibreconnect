import { prisma } from "@/lib/prisma";
import { changerStatut, ErreurMetier } from "@/lib/interventions";
import { assignationSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Affectation ou réaffectation manuelle par le superviseur.
 *
 * Deux cas :
 *  - l'intervention est NOUVELLE → transition vers ASSIGNEE,
 *  - elle est déjà ASSIGNEE ou EN_COURS → simple changement de technicien,
 *    sans transition de statut, mais avec une ligne d'historique.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const superviseur = await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { technicienId } = assignationSchema.parse(await lireCorps(requete));

    const [intervention, technicien] = await Promise.all([
      prisma.intervention.findUnique({
        where: { id },
        select: {
          id: true,
          statut: true,
          technicienId: true,
          client: { select: { operateurId: true } },
        },
      }),
      prisma.technicien.findUnique({
        where: { id: technicienId },
        select: {
          id: true,
          operateurId: true,
          matricule: true,
          utilisateur: { select: { nom: true, prenom: true, actif: true } },
        },
      }),
    ]);

    if (!intervention) {
      throw new ErreurMetier("Cette intervention n’existe pas.", 404);
    }
    if (!technicien) {
      throw new ErreurMetier("Ce technicien n’existe pas.", 404);
    }
    if (!technicien.utilisateur.actif) {
      throw new ErreurMetier(
        "Ce compte technicien est désactivé : réactivez-le avant de lui affecter une intervention.",
      );
    }
    if (technicien.operateurId !== intervention.client.operateurId) {
      throw new ErreurMetier(
        "Ce technicien ne travaille pas pour l’opérateur de cet abonné.",
      );
    }
    if (intervention.statut === "TERMINEE" || intervention.statut === "ANNULEE") {
      throw new ErreurMetier(
        "Une intervention terminée ou annulée ne peut plus être réaffectée.",
      );
    }
    if (intervention.technicienId === technicien.id) {
      throw new ErreurMetier(
        "Cette intervention est déjà affectée à ce technicien.",
      );
    }

    const nomComplet = `${technicien.utilisateur.prenom} ${technicien.utilisateur.nom} (${technicien.matricule})`;

    if (intervention.statut === "NOUVELLE") {
      await changerStatut({
        interventionId: id,
        vers: "ASSIGNEE",
        action: "ASSIGNATION_SUPERVISEUR",
        technicienId: technicien.id,
        commentaire: `Assignée par le superviseur à ${nomComplet}`,
        champs: {
          technicien: { connect: { id: technicien.id } },
          superviseur: { connect: { id: superviseur.id } },
        },
      });

      return reponseOk({ id });
    }

    // Réaffectation : le statut ne bouge pas, l'historique garde la trace.
    await prisma.$transaction(async (tx) => {
      await tx.intervention.update({
        where: { id },
        data: {
          technicien: { connect: { id: technicien.id } },
          superviseur: { connect: { id: superviseur.id } },
        },
      });
      await tx.historique.create({
        data: {
          interventionId: id,
          technicienId: technicien.id,
          action: "REASSIGNATION",
          ancienStatut: intervention.statut,
          nouveauStatut: intervention.statut,
          commentaire: `Réaffectée par le superviseur à ${nomComplet}`,
        },
      });
    });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
