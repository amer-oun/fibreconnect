"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton, LienBouton } from "@/components/ui/bouton";
import {
  ChampSelect,
  ChampTexte,
  MessageErreur,
} from "@/components/ui/champs";

export default function FormulaireTechnicien({
  operateurs,
}: {
  operateurs: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const donnees = Object.fromEntries(
      new FormData(evenement.currentTarget).entries(),
    );

    const reponse = await fetch("/api/techniciens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    });

    const corps = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      setErreur(corps.error ?? "Le compte n’a pas pu être créé.");
      setEnCours(false);
      return;
    }

    router.push(`/superviseur/techniciens/${corps.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-6 p-5 sm:p-6" noValidate>
      <fieldset className="flex flex-col gap-5">
        <legend className="eyebrow mb-3">Identité</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <ChampTexte id="prenom" label="Prénom" required placeholder="Karim" />
          <ChampTexte id="nom" label="Nom" required placeholder="Bouazizi" />
        </div>
        <ChampTexte
          id="telephone"
          label="Téléphone"
          type="tel"
          required
          placeholder="+216 98 111 222"
          indication="Ce numéro est visible par les abonnés dont il traite la panne."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-trait pt-6">
        <legend className="eyebrow mb-3">Affectation</legend>
        <ChampSelect
          id="operateurId"
          label="Réseau d’habilitation"
          required
          indication="Il ne verra que les pannes des abonnés de ce réseau. C’est la règle centrale de l’application."
          options={operateurs.map((o) => ({ valeur: o.id, libelle: o.nom }))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <ChampTexte
            id="matricule"
            label="Matricule"
            required
            placeholder="TT-003"
            indication="Unique, non modifiable ensuite."
          />
          <ChampTexte
            id="zone"
            label="Zone d’intervention"
            required
            placeholder="Tunis"
          />
        </div>
        <ChampTexte
          id="specialite"
          label="Spécialité"
          required
          placeholder="Raccordement FTTH, soudure optique…"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-trait pt-6">
        <legend className="eyebrow mb-3">Identifiants de connexion</legend>
        <ChampTexte
          id="email"
          label="Adresse e-mail"
          type="email"
          required
          placeholder="prenom.nom@fibreconnect.tn"
        />
        <ChampTexte
          id="motDePasse"
          label="Mot de passe provisoire"
          type="password"
          required
          autoComplete="new-password"
          indication="8 caractères minimum, une lettre et un chiffre. Communiquez-le au technicien : il pourra le changer depuis son profil."
        />
      </fieldset>

      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      <div className="flex flex-wrap gap-3 border-t border-trait pt-5">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer le compte technicien"}
        </Bouton>
        <LienBouton href="/superviseur/techniciens" variante="secondaire">
          Annuler
        </LienBouton>
      </div>
    </form>
  );
}
