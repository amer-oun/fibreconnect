import { annulerBulletinPaie } from "@/lib/facturation";
import { annulationBulletinSchema } from "@/lib/validations";
import { exigerRoleApi, lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Annulation d'un bulletin de paie enregistré par erreur.
 *
 * Le bulletin n'est pas supprimé : il garde ses montants, sa date et son
 * auteur, et reçoit le motif de son retrait. Effacer la ligne ne laisserait
 * aucune trace d'un mois un jour déclaré payé — la première chose que
 * chercherait qui relit les comptes.
 */
export async function DELETE(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { motif } = annulationBulletinSchema.parse(await lireCorps(requete));

    await annulerBulletinPaie({
      bulletinId: id,
      superviseurId: utilisateur.id,
      motif,
    });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
