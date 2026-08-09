"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  PRIORITES,
  PRIORITE_LABELS,
  TARIFS,
  TYPES_PANNE,
  TYPE_PANNE_LABELS,
  libelleTypePanne,
  tarifDe,
  totauxFacture,
} from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
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
  const [erreurDescription, setErreurDescription] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);

    // Le bouton reste actif : on valide ici et on renvoie la personne sur le
    // champ fautif. Un bouton grise n'explique jamais ce qui manque.
    if (description.trim().length < 20) {
      setErreurDescription(
        `Décrivez la panne en 20 caractères au minimum : il en manque ${20 - description.trim().length}.`,
      );
      document.getElementById("description")?.focus();
      return;
    }

    setErreurDescription(null);
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

  // Le meme calcul que celui du serveur a la cloture : ce que l'abonne lit ici
  // est exactement ce qu'il verra sur sa facture, aux pieces pres.
  const totaux = totauxFacture([{ montant: tarifDe(type) }]);

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-6 p-5 sm:p-6" noValidate>
      <div>
        <ChampSelect
          id="typePanne"
          label="Type de panne"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={TYPES_PANNE.map((t) => ({
            valeur: t,
            // Le prix est dans l'option elle-meme : l'abonne compare les types
            // et leurs tarifs d'un seul coup d'oeil, sans changer de champ.
            libelle: `${TYPE_PANNE_LABELS[t]} — ${formaterMontant(
              totauxFacture([{ montant: TARIFS[t] }]).montantTotal,
            )}`,
          }))}
        />

        {/*
          Le prix du deplacement, annonce avant de valider.
          C'est le point le plus important de ce formulaire : un abonne qui
          decouvre le montant a la fin de l'intervention n'a plus qu'un recours,
          la contestation. Le lui dire ici coute une phrase et evite un litige
          par facture.
        */}
        <div className="mt-2 rounded-net border border-trait bg-ivoire px-3 py-2.5 text-sm">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-ardoise">
              Déplacement et main-d’œuvre — {libelleTypePanne(type)}
            </span>
            <span className="tabulaire font-semibold text-nuit">
              {formaterMontant(totaux.montantTotal)}
            </span>
          </p>
          <p className="mt-1 text-xs text-ardoise">
            {formaterMontant(totaux.montantHT)} hors taxes, TVA{" "}
            {Math.round(totaux.tauxTva * 100)} % et droit de timbre compris.
            Les pièces éventuellement remplacées s’ajoutent, et le technicien
            vous les annonce avant de les poser.
          </p>
        </div>
      </div>

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
          onChange={(e) => {
            setDescription(e.target.value);
            if (erreurDescription) setErreurDescription(null);
          }}
          erreur={erreurDescription ?? undefined}
          indication={AIDES[type]}
          placeholder="Exemple : depuis hier soir, le voyant PON de la box clignote en rouge et plus aucun appareil n’a de connexion."
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
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Envoyer la déclaration"}
        </Bouton>
        <LienBouton href="/client/dashboard" variante="secondaire">
          Annuler
        </LienBouton>
      </div>
    </form>
  );
}
