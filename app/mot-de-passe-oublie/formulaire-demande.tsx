"use client";

import { useState } from "react";

import { Bouton } from "@/components/ui/bouton";
import { ChampTexte, MessageErreur, MessageSucces } from "@/components/ui/champs";

/**
 * Asks for the address, and says the same thing whatever comes back.
 *
 * The confirmation is phrased conditionally — « si un compte existe » — and it
 * is the server that writes it: a message composed here from the response
 * would eventually drift into saying whether the account was found.
 */
export default function FormulaireDemande() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setConfirmation(null);
    setEnCours(true);

    const donnees = new FormData(evenement.currentTarget);

    const reponse = await fetch("/api/compte/mot-de-passe-oublie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: donnees.get("email") }),
    });

    const corps = await reponse.json().catch(() => ({}));
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(corps.error ?? "La demande n’a pas pu être envoyée.");
      return;
    }

    setConfirmation(corps.data?.message ?? "Demande enregistrée.");
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5 p-6 sm:p-7" noValidate>
      <ChampTexte
        id="email"
        label="Adresse e-mail"
        type="email"
        required
        autoComplete="email"
        indication="Celle avec laquelle vous vous connectez."
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      {confirmation && <MessageSucces>{confirmation}</MessageSucces>}

      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Recevoir un lien de réinitialisation"}
      </Bouton>
    </form>
  );
}
