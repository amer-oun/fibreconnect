import { prisma } from "@/lib/prisma";
import { ErreurMetier, exigerProprieteClient } from "@/lib/interventions";
import { notationSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/**
 * Le client note une intervention terminée. Une seule fois.
 *
 * La note ne change pas le statut : elle ne passe donc pas par
 * `changerStatut()` et n'écrit pas de ligne d'historique.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("CLIENT");
    const { id } = await params;
    const { note } = notationSchema.parse(await lireCorps(requete));

    const client = await prisma.client.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!client) {
      throw new ErreurMetier("Profil client introuvable.", 404);
    }

    const intervention = await exigerProprieteClient(id, client.id);

    if (intervention.statut !== "TERMINEE") {
      throw new ErreurMetier(
        "Vous pourrez noter cette intervention une fois qu’elle sera terminée.",
      );
    }
    if (intervention.noteClient !== null) {
      throw new ErreurMetier("Vous avez déjà noté cette intervention.");
    }

    await prisma.intervention.update({
      where: { id },
      data: { noteClient: note },
    });

    return reponseOk({ id, note });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
