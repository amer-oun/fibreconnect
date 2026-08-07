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
          client: { select: { zone: true } },
        },
      }),
      prisma.technicien.findUnique({
        where: { id: technicienId },
        select: {
          id: true,
          zone: true,
          matricule: true,
          utilisateur: { select: { nom: true, prenom: true, statutCompte: true } },
        },
      }),
    ]);

    if (!intervention) {
      throw new ErreurMetier("Cette intervention n’existe pas.", 404);
    }
    if (!technicien) {
      throw new ErreurMetier("Ce technicien n’existe pas.", 404);
    }
    // Le statut d'abord : une intervention close ne se réaffecte pas, quel que
    // soit le technicien visé. Tester l'opérateur avant donnerait une raison
    // exacte mais hors sujet.
    if (intervention.statut === "TERMINEE" || intervention.statut === "ANNULEE") {
      throw new ErreurMetier(
        "Une intervention terminée ou annulée ne peut plus être réaffectée.",
      );
    }
    if (technicien.utilisateur.statutCompte !== "ACTIF") {
      throw new ErreurMetier(
        technicien.utilisateur.statutCompte === "EN_ATTENTE"
          ? "Ce compte technicien n’est pas encore validé : validez-le avant de lui affecter une intervention."
          : "Ce compte technicien est désactivé : réactivez-le avant de lui affecter une intervention.",
      );
    }
    if (intervention.technicienId === technicien.id) {
      throw new ErreurMetier(
        "Cette intervention est déjà affectée à ce technicien.",
      );
    }

    // La zone n'est PAS une interdiction ici, a la difference de l'acceptation.
    // Le superviseur est justement l'echappatoire quand une zone n'a personne :
    // il peut envoyer un technicien hors de son secteur, et l'historique le
    // dit explicitement pour que ce ne soit jamais une decision invisible.
    const horsZone = technicien.zone !== intervention.client.zone;

    const nomComplet = `${technicien.utilisateur.prenom} ${technicien.utilisateur.nom}${
      technicien.matricule ? ` (${technicien.matricule})` : ""
    }`;
    const mention = horsZone
      ? ` — hors zone : ${technicien.zone} vers ${intervention.client.zone}`
      : "";

    if (intervention.statut === "NOUVELLE") {
      await changerStatut({
        interventionId: id,
        vers: "ASSIGNEE",
        action: "ASSIGNATION_SUPERVISEUR",
        technicienId: technicien.id,
        commentaire: `Assignée par le superviseur à ${nomComplet}${mention}`,
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
          commentaire: `Réaffectée par le superviseur à ${nomComplet}${mention}`,
        },
      });
    });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
