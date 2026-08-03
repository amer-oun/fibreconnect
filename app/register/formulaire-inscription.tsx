"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Bouton } from "@/components/ui/bouton";
import { ChampSelect, ChampTexte, MessageErreur } from "@/components/ui/champs";

export default function FormulaireInscription({
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

    const formulaire = new FormData(evenement.currentTarget);
    const donnees = Object.fromEntries(formulaire.entries());

    const reponse = await fetch("/api/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    });

    const corps = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      setErreur(corps.error ?? "La création du compte a échoué.");
      setEnCours(false);
      return;
    }

    // Compte créé : on connecte directement plutôt que de renvoyer au login.
    const connexion = await signIn("credentials", {
      redirect: false,
      email: String(donnees.email),
      motDePasse: String(donnees.motDePasse),
    });

    if (connexion?.error) {
      router.push("/login");
      return;
    }

    router.push("/client/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-6 p-6 sm:p-7" noValidate>
      <fieldset className="flex flex-col gap-5">
        <legend className="eyebrow mb-3">Votre identité</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <ChampTexte
            id="prenom"
            label="Prénom"
            required
            autoComplete="given-name"
            placeholder="Nadia"
          />
          <ChampTexte
            id="nom"
            label="Nom"
            required
            autoComplete="family-name"
            placeholder="Chaabane"
          />
        </div>
        <ChampTexte
          id="telephone"
          label="Téléphone"
          required
          type="tel"
          autoComplete="tel"
          placeholder="+216 20 123 456"
          indication="Le technicien vous appellera sur ce numéro avant de se déplacer."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-trait pt-6">
        <legend className="eyebrow mb-3">Votre abonnement</legend>
        <ChampSelect
          id="operateurId"
          label="Opérateur"
          required
          indication="Seuls les techniciens de cet opérateur verront vos pannes."
          options={operateurs.map((o) => ({ valeur: o.id, libelle: o.nom }))}
        />
        <ChampTexte
          id="numContrat"
          label="Numéro de contrat"
          required
          placeholder="TT-2024-0007"
          indication="Il figure sur votre facture et sur votre contrat d’abonnement."
        />
        <ChampTexte
          id="adresse"
          label="Adresse"
          required
          autoComplete="street-address"
          placeholder="12 avenue Habib Bourguiba"
        />
        <ChampTexte
          id="ville"
          label="Ville"
          required
          autoComplete="address-level2"
          placeholder="Tunis"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-trait pt-6">
        <legend className="eyebrow mb-3">Vos identifiants</legend>
        <ChampTexte
          id="email"
          label="Adresse e-mail"
          required
          type="email"
          autoComplete="email"
          placeholder="prenom.nom@exemple.tn"
        />
        <ChampTexte
          id="motDePasse"
          label="Mot de passe"
          required
          type="password"
          autoComplete="new-password"
          indication="8 caractères minimum, avec au moins une lettre et un chiffre."
        />
      </fieldset>

      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      <Bouton type="submit" disabled={enCours} taille="grand">
        {enCours ? "Création du compte…" : "Créer mon compte"}
      </Bouton>
    </form>
  );
}
