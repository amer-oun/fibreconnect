"use client";

import { useState } from "react";
import Link from "next/link";

import { OPTIONS_ZONE } from "@/lib/constants";
import { Bouton } from "@/components/ui/bouton";
import { ChampSelect, ChampTexte, MessageErreur } from "@/components/ui/champs";

/**
 * Candidature d'un technicien.
 *
 * Pas de connexion automatique après l'envoi, contrairement à l'inscription
 * d'un abonné : le compte naît en attente de validation, il n'y a rien
 * derrière la porte tant que le superviseur n'a pas ouvert. On affiche donc un
 * accusé de réception plutôt que de rediriger vers un espace vide.
 */
export default function FormulaireInscriptionTechnicien() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const donnees = Object.fromEntries(
      new FormData(evenement.currentTarget).entries(),
    );

    const reponse = await fetch("/api/inscription/technicien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "La candidature n’a pas pu être envoyée.");
      setEnCours(false);
      return;
    }

    setEnvoye(true);
    setEnCours(false);
  }

  if (envoye) {
    return (
      <div className="p-6 sm:p-7">
        <p className="eyebrow text-signal-profond">Candidature reçue</p>
        <h2 className="mt-2 font-display text-lg font-semibold text-nuit">
          Votre demande est entre les mains du superviseur
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ardoise">
          Votre compte existe, mais la connexion reste fermée tant qu’il n’a pas
          été validé. Le superviseur vous attribuera un matricule et confirmera
          la zone que vous couvrirez. Vous pourrez vous connecter avec l’adresse
          e-mail et le mot de passe que vous venez de choisir.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-trait pt-5">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-net border border-nuit bg-nuit px-4 py-2 text-sm font-medium text-ivoire transition-colors hover:bg-nuit-700"
          >
            Aller à la connexion
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-net border border-trait bg-white px-4 py-2 text-sm font-medium text-nuit transition-colors hover:bg-ivoire"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-6 p-6 sm:p-7" noValidate>
      <fieldset className="flex flex-col gap-5">
        <legend className="eyebrow mb-3">Votre identité</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <ChampTexte id="prenom" label="Prénom" required placeholder="Yosr" />
          <ChampTexte id="nom" label="Nom" required placeholder="Hamdi" />
        </div>
        <ChampTexte
          id="telephone"
          label="Téléphone"
          required
          type="tel"
          autoComplete="tel"
          placeholder="+216 24 999 000"
          indication="Visible par les abonnés dont vous traiterez la panne."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-trait pt-6">
        <legend className="eyebrow mb-3">Votre métier</legend>
        <ChampTexte
          id="specialite"
          label="Spécialité"
          required
          placeholder="Raccordement FTTH, soudure optique…"
        />
        <ChampSelect
          id="zone"
          label="Zone souhaitée"
          required
          options={OPTIONS_ZONE}
          indication="Le secteur où vous pouvez vous déplacer. Le superviseur peut le corriger avant d’ouvrir votre compte."
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
        {enCours ? "Envoi…" : "Envoyer ma candidature"}
      </Bouton>

      <p className="text-xs text-ardoise">
        Le matricule est attribué par la société : il ne se choisit pas à
        l’inscription.
      </p>
    </form>
  );
}
