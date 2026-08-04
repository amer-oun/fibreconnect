import { prisma } from "@/lib/prisma";
import { changerStatut, ErreurMetier } from "@/lib/interventions";
import { exigerRoleApi, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Un technicien accepte une panne disponible.
 *
 * Regle centrale du projet, revérifiée ici et pas seulement dans l'affichage :
 * le client de l'intervention doit appartenir au même opérateur que lui.
 */
export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("TECHNICIEN");
    const { id } = await params;

    const technicien = await prisma.technicien.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true, operateurId: true, disponible: true },
    });
    if (!technicien) {
      throw new ErreurMetier("Profil technicien introuvable.", 404);
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
        technicienId: true,
        client: { select: { operateurId: true } },
      },
    });
    if (!intervention) {
      throw new ErreurMetier("Cette intervention n’existe pas.", 404);
    }

    if (intervention.client.operateurId !== technicien.operateurId) {
      throw new ErreurMetier(
        "Cette intervention concerne un autre opérateur que le vôtre.",
        403,
      );
    }

    // L'ordre compte : une intervention close n'est pas « déjà prise », elle
    // est terminée. Tester le statut avant le technicien évite un message faux.
    if (intervention.statut !== "NOUVELLE") {
      throw new ErreurMetier(
        intervention.technicienId
          ? "Cette intervention est déjà prise en charge."
          : "Cette intervention n’est plus disponible.",
        409,
      );
    }

    await changerStatut({
      interventionId: id,
      vers: "ASSIGNEE",
      action: "ACCEPTATION",
      technicienId: technicien.id,
      commentaire: "Intervention acceptée par le technicien",
      champs: { technicien: { connect: { id: technicien.id } } },
    });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
