"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  PRIORITES,
  PRIORITE_LABELS,
  TYPES_PANNE,
  TYPE_PANNE_LABELS,
} from "@/lib/constants";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import {
  ChampSelect,
  ChampZone,
  MessageErreur,
} from "@/components/ui/champs";
import ChampPhoto from "@/components/ui/champ-photo";

/** Ce que chaque type de panne demande de préciser, en clair. */
const AIDES: Record<string, string> = {
  COUPURE_TOTALE:
    "Indiquez la couleur et l’état des voyants de votre box, et depuis quand la connexion est coupée.",
  DEBIT_FAIBLE:
    "Indiquez le débit constaté, le débit prévu par votre abonnement, et les moments de la journée concernés.",
  ONT_DEFECTUEUX:
    "Décrivez le comportement de l’ONT : redémarrages, chauffe, voyant d’alarme.",
  CABLE_ENDOMMAGE:
    "Indiquez l’endroit du câble abîmé et, si vous le savez, la cause (travaux, intempéries, animal).",
  NOUVELLE_INSTALLATION:
    "Précisez si la gaine et la prise optique sont déjà en place, et l’étage du logement.",
  CHANGEMENT_ROUTEUR:
    "Précisez le modèle actuel et le problème rencontré (Wi-Fi, ports, redémarrages).",
  AUTRE: "Décrivez la situation le plus précisément possible.",
};

export default function FormulairePanne() {
  const router = useRouter();
  const [type, setType] = useState<string>("COUPURE_TOTALE");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const donnees = new FormData(evenement.currentTarget);

    const reponse = await fetch("/api/interventions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typePanne: donnees.get("typePanne"),
        priorite: donnees.get("priorite"),
        description: donnees.get("description"),
        photoPanne: photo,
      }),
    });

    const corps = await reponse.json();

    if (!reponse.ok) {
      setErreur(corps.error ?? "La déclaration n’a pas pu être enregistrée.");
      setEnCours(false);
      return;
    }

    router.push(`/client/suivi/${corps.data.id}`);
    router.refresh();
  }

  const restant = 1000 - description.length;

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-6 p-5 sm:p-6" noValidate>
      <ChampSelect
        id="typePanne"
        label="Type de panne"
        required
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={TYPES_PANNE.map((t) => ({
          valeur: t,
          libelle: TYPE_PANNE_LABELS[t],
        }))}
      />

      <ChampSelect
        id="priorite"
        label="Urgence"
        required
        defaultValue="NORMALE"
        indication="Réservez « Urgente » à une coupure totale qui vous empêche de travailler."
        options={PRIORITES.map((p) => ({
          valeur: p,
          libelle: PRIORITE_LABELS[p],
        }))}
      />

      <div>
        <ChampZone
          id="description"
          label="Description"
          required
          minLength={20}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          indication={AIDES[type]}
          placeholder="Exemple : depuis hier soir, le voyant PON de la box clignote en rouge et plus aucun appareil n’a de connexion."
        />
        <p className="mt-1.5 text-right font-mono text-xs text-brume">
          {description.length < 20
            ? `${20 - description.length} caractères manquants`
            : `${restant} caractères restants`}
        </p>
      </div>

      <ChampPhoto
        id="photoPanne"
        label="Photo (facultatif)"
        indication="Une photo de votre box, de ses voyants ou du câble abîmé aide le technicien à préparer son intervention."
        valeur={photo}
        onChange={setPhoto}
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      <div className="flex flex-wrap gap-3 border-t border-trait pt-5">
        <Bouton type="submit" disabled={enCours || description.trim().length < 20}>
          {enCours ? "Enregistrement…" : "Envoyer la déclaration"}
        </Bouton>
        <LienBouton href="/client/dashboard" variante="secondaire">
          Annuler
        </LienBouton>
      </div>
    </form>
  );
}
