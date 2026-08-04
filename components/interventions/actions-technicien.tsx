"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { RAPPORT_LONGUEUR_MIN } from "@/lib/constants";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";
import ChampPhoto from "@/components/ui/champ-photo";

/**
 * The three actions a technician performs on an intervention.
 *
 * Each one calls its own endpoint, which re-checks ownership server-side —
 * hiding a button is not access control.
 */

type Props = {
  interventionId: string;
  statut: string;
};

export default function ActionsTechnicien({ interventionId, statut }: Props) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [rapportOuvert, setRapportOuvert] = useState(false);
  const [rapport, setRapport] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  async function appeler(chemin: string, corps?: unknown) {
    setErreur(null);
    setEnCours(true);

    const reponse = await fetch(
      `/api/interventions/${interventionId}/${chemin}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps ?? {}),
      },
    );

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(donnees.error ?? "L’action n’a pas pu être enregistrée.");
      setEnCours(false);
      return false;
    }

    setEnCours(false);
    setRapportOuvert(false);
    setRapport("");
    setPhoto(null);
    router.refresh();
    return true;
  }

  if (rapportOuvert) {
    return (
      <div className="w-full md:w-96">
        <label
          htmlFor={`rapport-${interventionId}`}
          className="text-sm font-medium text-nuit"
        >
          Rapport d’intervention
        </label>
        <p className="mt-1 text-xs text-ardoise">
          Décrivez la cause trouvée et ce que vous avez fait. Ce texte est lu
          par l’abonné.
        </p>
        <textarea
          id={`rapport-${interventionId}`}
          value={rapport}
          onChange={(e) => setRapport(e.target.value)}
          rows={5}
          autoFocus
          maxLength={2000}
          placeholder="Exemple : connecteur SC/APC oxydé au PBO, nettoyage puis remplacement de la jarretière. Débit mesuré à 98 Mb/s après intervention."
          className="mt-2 w-full rounded-net border border-trait bg-white px-3 py-2.5 text-sm leading-relaxed text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
        />
        <p className="mt-1 text-right font-mono text-xs text-brume">
          {rapport.trim().length < RAPPORT_LONGUEUR_MIN
            ? `${RAPPORT_LONGUEUR_MIN - rapport.trim().length} caractères manquants`
            : `${rapport.length} caractères`}
        </p>

        <div className="mt-4">
          <ChampPhoto
            id={`photo-${interventionId}`}
            label="Photo du travail réalisé (facultatif)"
            indication="Elle est visible par l’abonné avec votre rapport."
            valeur={photo}
            onChange={setPhoto}
          />
        </div>

        {erreur && (
          <div className="mt-2">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Bouton
            taille="petit"
            disabled={enCours || rapport.trim().length < RAPPORT_LONGUEUR_MIN}
            onClick={() =>
              appeler("terminer", {
                rapport: rapport.trim(),
                photoRapport: photo,
              })
            }
          >
            {enCours ? "Enregistrement…" : "Enregistrer le rapport"}
          </Bouton>
          <Bouton
            taille="petit"
            variante="secondaire"
            onClick={() => {
              setRapportOuvert(false);
              setErreur(null);
            }}
          >
            Annuler
          </Bouton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2">
        {statut === "NOUVELLE" && (
          <Bouton
            taille="petit"
            disabled={enCours}
            onClick={() => appeler("accepter")}
          >
            {enCours ? "…" : "Accepter l’intervention"}
          </Bouton>
        )}

        {statut === "ASSIGNEE" && (
          <Bouton
            taille="petit"
            disabled={enCours}
            onClick={() => appeler("demarrer")}
          >
            {enCours ? "…" : "Démarrer l’intervention"}
          </Bouton>
        )}

        {statut === "EN_COURS" && (
          <Bouton taille="petit" onClick={() => setRapportOuvert(true)}>
            Terminer l’intervention
          </Bouton>
        )}
      </div>

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
    </div>
  );
}
