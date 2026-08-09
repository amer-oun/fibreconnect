"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";
import { ChampTexte, MessageErreur, MessageSucces } from "@/components/ui/champs";

/**
 * Choosing the new password.
 *
 * No session is opened on success: the visitor goes back to /login and types
 * the password they just chose. An intercepted e-mail must not become an open
 * session — it only ever grants the right to set a password.
 */
export default function FormulaireReinitialisation({
  jeton,
}: {
  jeton: string;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const donnees = new FormData(evenement.currentTarget);

    const reponse = await fetch("/api/compte/reinitialiser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jeton,
        nouveau: donnees.get("nouveau"),
        confirmation: donnees.get("confirmation"),
      }),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "Le mot de passe n’a pas pu être enregistré.");
      setEnCours(false);
      return;
    }

    setSucces(true);
    setEnCours(false);
    // Le temps de lire la confirmation, puis la page de connexion.
    setTimeout(() => router.push("/login"), 2500);
  }

  if (succes) {
    return (
      <div className="p-6 sm:p-7">
        <MessageSucces>
          Votre mot de passe est enregistré. Connectez-vous avec celui que vous
          venez de choisir.
        </MessageSucces>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5 p-6 sm:p-7" noValidate>
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
        label="Confirmer le mot de passe"
        type="password"
        required
        autoComplete="new-password"
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Bouton>
    </form>
  );
}
