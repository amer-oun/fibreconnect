import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { echouerPaiement } from "@/lib/facturation";
import { exigerRoleApi, reponseOk, traiterErreur } from "@/lib/api";

/**
 * L'abonne abandonne un paiement commence, ou la passerelle le refuse.
 *
 * Le paiement passe en ECHOUE plutot que d'etre supprime : une tentative
 * refusee est une information, pour l'abonne qui s'y reprend a deux fois comme
 * pour la societe qui verra que la facture n'est pas restee sans reponse.
 */
export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("CLIENT");
    const { reference } = await params;

    const paiement = await prisma.paiement.findUnique({
      where: { reference },
      select: {
        facture: { select: { intervention: { select: { clientId: true } } } },
      },
    });
    if (!paiement) {
      throw new ErreurMetier("Ce paiement n’existe pas.", 404);
    }

    const client = await prisma.client.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!client || client.id !== paiement.facture.intervention.clientId) {
      throw new ErreurMetier("Ce paiement n’existe pas.", 404);
    }

    await echouerPaiement(reference);
    return reponseOk({ reference });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
