import { prisma } from "@/lib/prisma";
import { creerIntervention, ErreurMetier } from "@/lib/interventions";
import { nouvellePanneSchema } from "@/lib/validations";
import {
  exigerRoleApi,
  lireCorps,
  reponseOk,
  traiterErreur,
} from "@/lib/api";

/** Declaration d'une panne par le client connecte. */
export async function POST(requete: Request) {
  try {
    const utilisateur = await exigerRoleApi("CLIENT");
    const donnees = nouvellePanneSchema.parse(await lireCorps(requete));

    const client = await prisma.client.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!client) {
      throw new ErreurMetier(
        "Votre compte n’est rattaché à aucun contrat d’abonné.",
        409,
      );
    }

    const intervention = await creerIntervention({
      clientId: client.id,
      typePanne: donnees.typePanne,
      priorite: donnees.priorite,
      description: donnees.description,
    });

    return reponseOk({ id: intervention.id }, 201);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
