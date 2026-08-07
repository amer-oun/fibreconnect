"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";
import ChampPhoto from "@/components/ui/champ-photo";
import {
  ChampTexte,
  MessageErreur,
  MessageSucces,
} from "@/components/ui/champs";

export default function FormulaireProfil({
  valeurs,
}: {
  valeurs: {
    telephone: string;
    specialite: string;
    disponible: boolean;
    photoUrl: string | null;
  };
}) {
  const router = useRouter();
  const [disponible, setDisponible] = useState(valeurs.disponible);
  const [photoUrl, setPhotoUrl] = useState(valeurs.photoUrl);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);

    const donnees = new FormData(evenement.currentTarget);

    const reponse = await fetch("/api/technicien/profil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telephone: donnees.get("telephone"),
        specialite: donnees.get("specialite"),
        disponible,
        photoUrl,
      }),
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
      <ChampPhoto
        id="photo-technicien"
        label="Photo de profil"
        indication="Elle permet à l’abonné de reconnaître qui sonne à sa porte."
        valeur={photoUrl}
        onChange={setPhotoUrl}
      />

      <ChampTexte
        id="telephone"
        label="Téléphone"
        required
        type="tel"
        defaultValue={valeurs.telephone}
        indication="Le numéro que voient les abonnés dont vous traitez la panne."
      />

      <ChampTexte
        id="specialite"
        label="Spécialité"
        required
        defaultValue={valeurs.specialite}
        placeholder="Raccordement FTTH, soudure optique…"
      />

      <div className="rounded-net border border-trait bg-ivoire p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="mt-0.5 size-4 accent-[#0E7490]"
          />
          <span>
            <span className="block text-sm font-medium text-nuit">
              Je suis disponible pour de nouvelles interventions
            </span>
            <span className="mt-0.5 block text-xs text-ardoise">
              Décochez pendant un congé ou un arrêt : votre superviseur le voit
              immédiatement et cesse de vous affecter des pannes.
            </span>
          </span>
        </label>
      </div>

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      {succes && <MessageSucces>Votre profil est à jour.</MessageSucces>}

      <div className="border-t border-trait pt-5">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer mon profil"}
        </Bouton>
      </div>
    </form>
  );
}
