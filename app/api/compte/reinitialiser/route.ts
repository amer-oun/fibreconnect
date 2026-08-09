import { reinitialiserMotDePasse } from "@/lib/reinitialisation";
import { oublierEchecsDuCompte } from "@/lib/limitation";
import { reinitialisationSchema } from "@/lib/validations";
import { lireCorps, reponseOk, traiterErreur } from "@/lib/api";

/**
 * Pose le nouveau mot de passe, en consommant le lien.
 *
 * Aucune session n'est ouverte au passage, volontairement : l'utilisateur
 * repasse par /login. Connecter automatiquement quiconque présente un lien
 * ferait d'un courriel intercepté une session ouverte, alors qu'il ne donne
 * ici que le droit de changer un mot de passe — qui sera ensuite demandé.
 */
export async function POST(requete: Request) {
  try {
    const { jeton, nouveau } = reinitialisationSchema.parse(
      await lireCorps(requete),
    );

    const { email } = await reinitialiserMotDePasse(jeton, nouveau);

    // Quelqu'un qui s'est trompé cinq fois avant de renoncer et de demander un
    // lien est bloqué pour un quart d'heure. Il vient de prouver qu'il relève
    // les courriels du compte : lui refuser la connexion maintenant n'aurait
    // plus rien d'une protection.
    oublierEchecsDuCompte(email);

    return reponseOk({
      message: "Votre mot de passe est enregistré. Vous pouvez vous connecter.",
    });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
