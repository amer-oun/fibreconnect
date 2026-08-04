import { ErreurMetier } from "@/lib/interventions";
import { enregistrerPhoto } from "@/lib/televersement";
import { reponseOk, traiterErreur } from "@/lib/api";
import { utilisateurConnecte } from "@/lib/session";

/**
 * Photo upload, reserved to signed-in users.
 *
 * Returns the public path only; attaching it to an intervention is a separate
 * call, which re-validates that the path is one we wrote.
 */
export async function POST(requete: Request) {
  try {
    const utilisateur = await utilisateurConnecte();
    if (!utilisateur) {
      throw new ErreurMetier("Vous devez être connecté.", 401);
    }

    const formulaire = await requete.formData();
    const fichier = formulaire.get("fichier");

    if (!(fichier instanceof File)) {
      throw new ErreurMetier("Aucun fichier reçu.");
    }

    const chemin = await enregistrerPhoto(fichier);
    return reponseOk({ chemin }, 201);
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
