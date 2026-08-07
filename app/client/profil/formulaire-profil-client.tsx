"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { OPTIONS_ZONE } from "@/lib/constants";
import { Bouton } from "@/components/ui/bouton";
import {
  ChampSelect,
  ChampTexte,
  MessageErreur,
  MessageSucces,
} from "@/components/ui/champs";

export default function FormulaireProfilClient({
  valeurs,
}: {
  valeurs: {
    prenom: string;
    nom: string;
    telephone: string;
    adresse: string;
    ville: string;
    zone: string;
  };
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);

    const donnees = Object.fromEntries(
      new FormData(evenement.currentTarget).entries(),
    );

    const reponse = await fetch("/api/client/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "Les modifications n’ont pas pu être enregistrées.");
      setEnCours(false);
      return;
    }

    setSucces(true);
    setEnCours(false);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5 p-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <ChampTexte
          id="prenom"
          label="Prénom"
          required
          defaultValue={valeurs.prenom}
          autoComplete="given-name"
        />
        <ChampTexte
          id="nom"
          label="Nom"
          required
          defaultValue={valeurs.nom}
          autoComplete="family-name"
        />
      </div>

      <ChampTexte
        id="telephone"
        label="Téléphone"
        type="tel"
        required
        defaultValue={valeurs.telephone}
        autoComplete="tel"
        indication="Le technicien vous appelle sur ce numéro avant de se déplacer."
      />

      <ChampTexte
        id="adresse"
        label="Adresse d’intervention"
        required
        defaultValue={valeurs.adresse}
        autoComplete="street-address"
      />

      <ChampTexte
        id="ville"
        label="Ville"
        required
        defaultValue={valeurs.ville}
        autoComplete="address-level2"
      />

      <ChampSelect
        id="zone"
        label="Zone d’intervention"
        required
        defaultValue={valeurs.zone}
        options={OPTIONS_ZONE}
        indication="Le gouvernorat dont dépend votre logement. Il détermine quel technicien voit vos pannes."
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      {succes && <MessageSucces>Vos informations sont à jour.</MessageSucces>}

      <div className="border-t border-trait pt-5">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer mes informations"}
        </Bouton>
      </div>
    </form>
  );
}
