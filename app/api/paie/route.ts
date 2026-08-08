import { verserPaie } from "@/lib/facturation";
import { versementPaieSchema } from "@/lib/validations";
import { exigerRoleApi, lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Le superviseur enregistre la paie qu'il vient de verser à un technicien.
 *
 * Ne déclenche aucun virement : la société paie ses salariés hors de
 * l'application, comme elle reçoit les espèces hors de l'application. Ce que
 * cette route enregistre, c'est l'attestation que le versement a eu lieu — et
 * c'est elle qui empêche de payer deux fois le même mois.
 */
export async function POST(requete: Request) {
  try {
    const utilisateur = await exigerRoleApi("SUPERVISEUR");
    const { technicienId, mois, commentaire } = versementPaieSchema.parse(
      await lireCorps(requete),
    );

    const bulletin = await verserPaie({
      technicienId,
      mois,
      superviseurId: utilisateur.id,
      commentaire,
    });

    return reponseOk(
      { id: bulletin.id, montantTotal: bulletin.montantTotal, mois: bulletin.mois },
      201,
    );
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
