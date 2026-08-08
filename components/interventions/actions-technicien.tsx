"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  RAPPORT_LONGUEUR_MIN,
  libelleTypePanne,
  tarifDe,
  totauxFacture,
} from "@/lib/constants";
import { dinarsEnMillimes, formaterMontant } from "@/lib/monnaie";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";
import ChampPhoto from "@/components/ui/champ-photo";

/**
 * The three actions a technician performs on an intervention.
 *
 * Each one calls its own endpoint, which re-checks ownership server-side —
 * hiding a button is not access control.
 */

/** Une ligne de piece en cours de saisie : le montant est du texte tant que le doigt tape. */
type SaisiePiece = { designation: string; dinars: string };

type Props = {
  interventionId: string;
  statut: string;
  /** Sert à annoncer le tarif de base au moment de clôturer. */
  typePanne: string;
};

export default function ActionsTechnicien({
  interventionId,
  statut,
  typePanne,
}: Props) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [rapportOuvert, setRapportOuvert] = useState(false);
  const [rapport, setRapport] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [pieces, setPieces] = useState<SaisiePiece[]>([]);

  const tarifBase = tarifDe(typePanne);
  const piecesRetenues = pieces
    .map((p) => ({
      designation: p.designation.trim(),
      montant: dinarsEnMillimes(Number(p.dinars.replace(",", "."))),
    }))
    .filter((p) => p.designation !== "" && Number.isFinite(p.montant) && p.montant > 0);

  // Les mêmes totaux que ceux que le serveur calculera à la clôture : le
  // technicien annonce à l'abonné ce que celui-ci verra sur sa facture, taxes
  // comprises, et non un hors-taxes qu'il faudrait ensuite expliquer.
  const totaux = totauxFacture([
    { montant: tarifBase },
    ...piecesRetenues,
  ]);

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
    setPieces([]);
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
          // Pas d'`autoFocus` : sur le telephone du technicien, il ferait
          // surgir le clavier et sauter la page avant qu'il ait pu lire.
          maxLength={2000}
          placeholder="Exemple : connecteur SC/APC oxydé au PBO, nettoyage puis remplacement de la jarretière. Débit mesuré à 98 Mb/s après intervention."
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

        {/* Facturation ------------------------------------------------------
            Le tarif du deplacement est affiche, pas saisi : il a ete annonce a
            l'abonne quand il a declare sa panne, le technicien ne le renegocie
            pas sur place. Seules les pieces s'ajoutent. */}
        <div className="mt-5 rounded-net border border-trait bg-ivoire p-3">
          <p className="text-sm font-medium text-nuit">Facture de l’abonné</p>

          <div className="mt-2 flex justify-between gap-4 text-sm">
            <span className="text-ardoise">
              Déplacement — {libelleTypePanne(typePanne)}
            </span>
            <span className="tabulaire text-nuit">
              {formaterMontant(tarifBase)}
            </span>
          </div>

          {pieces.map((piece, index) => (
            <div key={index} className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`piece-${interventionId}-${index}`}
                  className="sr-only"
                >
                  Désignation de la pièce {index + 1}
                </label>
                <input
                  id={`piece-${interventionId}-${index}`}
                  value={piece.designation}
                  onChange={(e) =>
                    setPieces((liste) =>
                      liste.map((p, i) =>
                        i === index ? { ...p, designation: e.target.value } : p,
                      ),
                    )
                  }
                  maxLength={80}
                  placeholder="Pièce remplacée (ex. jarretière SC/APC 3 m)"
                  className="w-full rounded-net border border-trait bg-white px-3 py-2 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
                />
              </div>
              <div className="w-28">
                <label
                  htmlFor={`montant-${interventionId}-${index}`}
                  className="sr-only"
                >
                  Montant de la pièce {index + 1}, en dinars
                </label>
                <input
                  id={`montant-${interventionId}-${index}`}
                  value={piece.dinars}
                  onChange={(e) =>
                    setPieces((liste) =>
                      liste.map((p, i) =>
                        i === index ? { ...p, dinars: e.target.value } : p,
                      ),
                    )
                  }
                  inputMode="decimal"
                  placeholder="0,000"
                  className="w-full rounded-net border border-trait bg-white px-3 py-2 text-right text-sm text-nuit tabulaire placeholder:text-brume focus:border-signal focus:outline-none"
                />
              </div>
              <Bouton
                taille="petit"
                variante="discret"
                onClick={() =>
                  setPieces((liste) => liste.filter((_, i) => i !== index))
                }
              >
                Retirer
              </Bouton>
            </div>
          ))}

          {pieces.length < 10 && (
            <div className="mt-3">
              <Bouton
                taille="petit"
                variante="secondaire"
                onClick={() =>
                  setPieces((liste) => [...liste, { designation: "", dinars: "" }])
                }
              >
                Ajouter une pièce
              </Bouton>
            </div>
          )}

          <div className="mt-3 space-y-1 border-t border-trait pt-2 text-sm">
            <div className="flex justify-between gap-4 text-ardoise">
              <span>Total hors taxes</span>
              <span className="tabulaire">
                {formaterMontant(totaux.montantHT)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-ardoise">
              <span>
                TVA {Math.round(totaux.tauxTva * 100)} % et droit de timbre
              </span>
              <span className="tabulaire">
                {formaterMontant(totaux.montantTva + totaux.timbreFiscal)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-nuit">
                À payer par l’abonné
              </span>
              <span className="tabulaire font-display font-bold text-nuit">
                {formaterMontant(totaux.montantTotal)}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-ardoise">
            La facture part chez l’abonné dès l’enregistrement du rapport. Elle
            n’est plus modifiable ensuite.
          </p>
        </div>

        {erreur && (
          <div className="mt-2">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Bouton
            taille="petit"
            disabled={enCours}
            onClick={() => {
              // Bouton toujours actif : on explique ce qui manque plutot que
              // de le griser sans raison visible.
              if (rapport.trim().length < RAPPORT_LONGUEUR_MIN) {
                setErreur(
                  `Le rapport doit faire ${RAPPORT_LONGUEUR_MIN} caractères au minimum : il en manque ${RAPPORT_LONGUEUR_MIN - rapport.trim().length}.`,
                );
                document.getElementById(`rapport-${interventionId}`)?.focus();
                return;
              }
              const incompletes = pieces.length - piecesRetenues.length;
              if (incompletes > 0) {
                setErreur(
                  incompletes === 1
                    ? "Une pièce n’a pas de désignation ou pas de montant. Complétez-la ou retirez-la."
                    : `${incompletes} pièces n’ont pas de désignation ou pas de montant. Complétez-les ou retirez-les.`,
                );
                return;
              }
              appeler("terminer", {
                rapport: rapport.trim(),
                photoRapport: photo,
                pieces: piecesRetenues,
              });
            }}
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
