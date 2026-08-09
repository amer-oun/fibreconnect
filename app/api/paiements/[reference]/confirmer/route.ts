import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { ErreurMetier } from "@/lib/interventions";
import { confirmerPaiement } from "@/lib/facturation";
import { prevenirPaiement } from "@/lib/courriels";
import { utilisateurConnecte } from "@/lib/session";
import { empreintePaiementSchema } from "@/lib/validations";
import { lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Confirmation d'un paiement en ligne.
 *
 * Deux appelants legitimes, pour deux raisons differentes :
 *
 *  - **carte et D17** : la passerelle repond immediatement, donc l'abonne
 *    lui-meme confirme depuis son ecran de paiement. C'est ici que se
 *    brancherait le webhook du prestataire le jour ou il y en a un — la
 *    signature de `confirmerPaiement` ne changerait pas.
 *  - **virement** : personne ne peut savoir depuis l'application que l'argent
 *    est arrive. Seul le superviseur, qui a le releve bancaire sous les yeux,
 *    peut le dire. Laisser l'abonne confirmer son propre virement reviendrait a
 *    solder une facture sur declaration.
 */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const utilisateur = await utilisateurConnecte();
    if (!utilisateur) {
      throw new ErreurMetier("Vous devez être connecté.", 401);
    }

    const { reference } = await params;

    const paiement = await prisma.paiement.findUnique({
      where: { reference },
      select: {
        moyen: true,
        facture: { select: { intervention: { select: { clientId: true } } } },
      },
    });
    if (!paiement) {
      throw new ErreurMetier("Ce paiement n’existe pas.", 404);
    }

    if (utilisateur.role !== "SUPERVISEUR") {
      if (utilisateur.role !== "CLIENT") {
        throw new ErreurMetier("Vous n’avez pas accès à cette action.", 403);
      }
      const client = await prisma.client.findUnique({
        where: { utilisateurId: utilisateur.id },
        select: { id: true },
      });
      if (!client || client.id !== paiement.facture.intervention.clientId) {
        throw new ErreurMetier("Ce paiement n’existe pas.", 404);
      }
      if (paiement.moyen === "VIREMENT") {
        throw new ErreurMetier(
          "Un virement est confirmé par la société à sa réception sur le compte.",
          403,
        );
      }
    }

    /*
     * Le libellé du reçu est composé **ici**, à partir de la marque et des
     * quatre derniers chiffres — jamais repris tel quel du navigateur. Un
     * texte libre venu du client se retrouverait imprimé sur une facture,
     * ce qui en ferait un champ d'injection sur un document officiel.
     */
    const empreinte = empreintePaiementSchema.parse(await lireCorps(requete));
    const detail =
      empreinte.marque && empreinte.quatreDerniers
        ? `${empreinte.marque} ••••${empreinte.quatreDerniers}`
        : empreinte.telephone
          ? `D17 ••••${empreinte.telephone.replace(/\D/g, "").slice(-4)}`
          : null;

    await confirmerPaiement(reference, detail);

    // Le recu part une fois le paiement confirme, jamais a son ouverture : un
    // virement annonce n'est pas un virement recu.
    after(() => prevenirPaiement(reference));

    return reponseOk({ reference });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
