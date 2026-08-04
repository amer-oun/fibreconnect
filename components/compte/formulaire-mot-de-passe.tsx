"use client";

import { useState } from "react";

import { Bouton } from "@/components/ui/bouton";
import {
  ChampTexte,
  MessageErreur,
  MessageSucces,
} from "@/components/ui/champs";

/**
 * Password change, shared by the three spaces.
 *
 * The current password is asked for: an open session left on a phone must not
 * be enough to take over the account.
 */
export default function FormulaireMotDePasse() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);

    const formulaire = evenement.currentTarget;
    const donnees = new FormData(formulaire);

    const reponse = await fetch("/api/compte/mot-de-passe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actuel: donnees.get("actuel"),
        nouveau: donnees.get("nouveau"),
        confirmation: donnees.get("confirmation"),
      }),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "Le mot de passe n’a pas pu être changé.");
      setEnCours(false);
      return;
    }

    formulaire.reset();
    setSucces(true);
    setEnCours(false);
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5 p-5" noValidate>
      <ChampTexte
        id="actuel"
        label="Mot de passe actuel"
        type="password"
        required
        autoComplete="current-password"
      />
      <ChampTexte
        id="nouveau"
        label="Nouveau mot de passe"
        type="password"
        required
        autoComplete="new-password"
        indication="8 caractères minimum, avec au moins une lettre et un chiffre."
      />
      <ChampTexte
        id="confirmation"
        label="Confirmer le nouveau mot de passe"
        type="password"
        required
        autoComplete="new-password"
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      {succes && (
        <MessageSucces>
          Votre mot de passe a été changé. Il sera demandé à votre prochaine
          connexion.
        </MessageSucces>
      )}

      <div className="border-t border-trait pt-5">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Changer mon mot de passe"}
        </Bouton>
      </div>
    </form>
  );
}
