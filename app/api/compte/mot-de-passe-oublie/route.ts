import { after } from "next/server";

import {
  DUREE_JETON_MINUTES,
  demanderReinitialisation,
} from "@/lib/reinitialisation";
import { envoyerLienReinitialisation } from "@/lib/courriels";
import {
  adresseDeLaRequete,
  enregistrerDemande,
  secondesAvantNouvelleDemande,
} from "@/lib/limitation";
import { demandeReinitialisationSchema } from "@/lib/validations";
import { lireCorps, reponseErreur, reponseOk, traiterErreur } from "@/lib/api";

/**
 * « J'ai oublié mon mot de passe. »
 *
 * **Cette route répond exactement la même chose que l'adresse ait un compte ou
 * non.** C'est la seule règle qui compte ici : une réponse différente ferait de
 * ce formulaire un annuaire des abonnés de la société, interrogeable par
 * n'importe qui, sans même se connecter. Le message dit donc « si un compte
 * existe », au conditionnel, et il le dit toujours.
 *
 * Le plafond de demandes est distinct de celui des tentatives de connexion :
 * chaque appel déclenche un envoi de courriel, donc sans plafond ce formulaire
 * inonderait la boîte de n'importe qui.
 */
const REPONSE_UNIFORME =
  "Si un compte existe pour cette adresse, un lien vient d’y être envoyé. " +
  "Vérifiez votre boîte de réception, et vos indésirables.";

export async function POST(requete: Request) {
  try {
    const { email } = demandeReinitialisationSchema.parse(
      await lireCorps(requete),
    );

    const adresseIp = adresseDeLaRequete(
      Object.fromEntries(requete.headers.entries()),
    );

    const attente = secondesAvantNouvelleDemande(email, adresseIp);
    if (attente > 0) {
      return reponseErreur(
        `Trop de demandes. Réessayez dans ${Math.ceil(attente / 60)} minute(s).`,
        429,
      );
    }
    enregistrerDemande(email, adresseIp);

    const demande = await demanderReinitialisation(email);

    // `demande` vaut null pour une adresse inconnue comme pour un compte qui
    // ne peut pas se connecter. Dans les deux cas, rien ne part et la réponse
    // ne change pas d'un mot.
    if (demande) {
      after(() =>
        envoyerLienReinitialisation({
          ...demande,
          dureeMinutes: DUREE_JETON_MINUTES,
        }),
      );
    }

    return reponseOk({ message: REPONSE_UNIFORME });
  } catch (erreur) {
    return traiterErreur(erreur);
  }
}
