import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { exigerFactureDuClient, ouvrirPaiement } from "@/lib/facturation";
import { paiementEnLigneSchema } from "@/lib/validations";
import { exigerRoleApi, lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Ouverture d'un paiement en ligne par l'abonne.
 *
 * Ne deplace pas d'argent : cree l'intention et rend sa reference, que l'ecran
 * de paiement confirmera ensuite. Voir lib/facturation.ts pour la raison de ce
 * decoupage en deux temps.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("CLIENT");
    const { id } = await params;
    const { moyen } = paiementEnLigneSchema.parse(await lireCorps(requete));

    const client = await prisma.client.findUnique({
      where: { utilisateurId: utilisateur.id },
      select: { id: true },
    });
    if (!client) {
      throw new ErreurMetier("Profil client introuvable.", 404);
    }

    await exigerFactureDuClient(id, client.id);
    const paiement = await ouvrirPaiement({ factureId: id, moyen });

    return reponseOk({
      reference: paiement.reference,
      montant: paiement.montant,
      moyen: paiement.moyen,
    });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
