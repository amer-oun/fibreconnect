import { annulerFacture, corrigerFacture } from "@/lib/facturation";
import { ErreurMetier } from "@/lib/interventions";
import {
  annulationFactureSchema,
  correctionFactureSchema,
} from "@/lib/validations";
import { exigerRoleApi, lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Rectification d'une facture par le superviseur.
 *
 * `PATCH` corrige les lignes, `DELETE` annule. Deux verbes plutot que deux
 * routes : c'est la meme facture et le meme controle d'acces, seule l'issue
 * differe. Les deux exigent un motif, que l'abonne lira.
 */
export async function PATCH(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { motif, lignes } = correctionFactureSchema.parse(
      await lireCorps(requete),
    );

    const facture = await corrigerFacture({
      factureId: id,
      superviseurId: utilisateur.id,
      motif,
      lignes,
    });

    return reponseOk({ id: facture.id, montantTotal: facture.montantTotal });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}

export async function DELETE(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;
    const { motif } = annulationFactureSchema.parse(await lireCorps(requete));

    await annulerFacture({
      factureId: id,
      superviseurId: utilisateur.id,
      motif,
    });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}

/** Toute autre méthode : l'API dit ce qu'elle accepte plutôt que de planter. */
export async function POST() {
  return traiterErreur(
    new ErreurMetier(
      "Utilisez PATCH pour corriger une facture, DELETE pour l’annuler.",
      405,
    ),
  );
}
