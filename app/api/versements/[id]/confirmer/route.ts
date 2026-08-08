import { confirmerVersement } from "@/lib/facturation";
import { exigerRoleApi, reponseOk, traiterErreur } from "@/lib/api";

/** Le superviseur accuse reception des especes remises par un technicien. */
export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const utilisateur = await exigerRoleApi("SUPERVISEUR");
    const { id } = await params;

    await confirmerVersement({ versementId: id, superviseurId: utilisateur.id });

    return reponseOk({ id });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
