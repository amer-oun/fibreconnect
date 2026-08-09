import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { changerStatut, ErreurMetier } from "@/lib/interventions";
import { prevenirAnnulationParLaSociete } from "@/lib/courriels";
import { annulationSchema } from "@/lib/validations";
import {
  lireCorps,
  reponseErreur,
  reponseOk,
  traiterErreur,
} from "@/lib/api";
import { utilisateurConnecte } from "@/lib/session";

/**
 * Annulation d'une intervention.
 *
 * Deux profils y ont droit, pour des raisons différentes : le client peut
 * renoncer à sa propre demande, le superviseur peut annuler n'importe
 * laquelle. Un technicien ne peut pas annuler.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await utilisateurConnecte();
    if (!utilisateur) return reponseErreur("Vous devez être connecté.", 401);

    const { id } = await params;
    const { motif } = annulationSchema.parse(await lireCorps(requete));

    if (utilisateur.role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { utilisateurId: utilisateur.id },
        select: { id: true },
      });
      const intervention = await prisma.intervention.findUnique({
        where: { id },
        select: { clientId: true },
      });

      if (!client || !intervention || intervention.clientId !== client.id) {
        throw new ErreurMetier("Cette intervention n’existe pas.", 404);
      }

      await changerStatut({
        interventionId: id,
        vers: "ANNULEE",
        action: "ANNULATION",
        commentaire: motif
          ? `Annulée par le client : ${motif}`
          : "Annulée par le client",
      });

      return reponseOk({ id });
    }

    if (utilisateur.role === "SUPERVISEUR") {
      await changerStatut({
        interventionId: id,
        vers: "ANNULEE",
        action: "ANNULATION",
        commentaire: motif
          ? `Annulée par le superviseur : ${motif}`
          : "Annulée par le superviseur",
      });

      // Seule cette branche ecrit a l'abonne : quand c'est lui qui renonce, il
      // vient de cliquer sur le bouton, le lui apprendre par courriel n'aurait
      // aucun sens.
      after(() => prevenirAnnulationParLaSociete(id, motif ?? null));

      return reponseOk({ id });
    }

    return reponseErreur("Vous n’avez pas accès à cette action.", 403);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
