"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formaterMontant } from "@/lib/monnaie";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * Records a month's pay as handed over, from the payroll table.
 *
 * The action is terminal — a slip cannot be un-issued — so it is never a single
 * click on a row. Pressing "Enregistrer" opens a panel that names the
 * technician, the month and the amount, and asks again. That confirmation step
 * is the whole safety mechanism: five rows of a table look alike, and the
 * button that pays Karim sits two centimetres above the one that pays Sonia.
 *
 * No amount travels in the request. The server recomputes it, exactly as it
 * does for a cash remittance.
 */
export default function VersementPaie({
  technicienId,
  nom,
  mois,
  libelleMois,
  montant,
  bulletinId,
}: {
  technicienId: string;
  nom: string;
  /** `2026-08`. */
  mois: string;
  /** « août 2026 ». */
  libelleMois: string;
  /** En millimes, pour l'affichage seulement. */
  montant: number;
  /**
   * Bulletin déjà enregistré. Présent, le composant propose de l'annuler au
   * lieu de l'enregistrer — le geste inverse, au même endroit.
   */
  bulletinId?: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const annulation = bulletinId !== undefined;

  async function envoyer() {
    if (annulation && commentaire.trim().length < 10) {
      setErreur(
        "Expliquez l’annulation en 10 caractères minimum : elle reste inscrite au bulletin.",
      );
      return;
    }

    setErreur(null);
    setEnCours(true);
    const reponse = await fetch(
      annulation ? `/api/paie/${bulletinId}` : "/api/paie",
      {
        method: annulation ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          annulation
            ? { motif: commentaire.trim() }
            : {
                technicienId,
                mois,
                commentaire: commentaire.trim() || undefined,
              },
        ),
      },
    );
    setEnCours(false);

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(
        donnees.error ??
          (annulation
            ? "L’annulation n’a pas pu être enregistrée."
            : "Le versement n’a pas pu être enregistré."),
      );
      return;
    }

    setOuvert(false);
    setCommentaire("");
    router.refresh();
  }

  if (!ouvert) {
    return (
      <Bouton
        taille="petit"
        variante={annulation ? "discret" : "secondaire"}
        onClick={() => setOuvert(true)}
      >
        {annulation ? "Annuler ce versement" : "Enregistrer le versement"}
      </Bouton>
    );
  }

  if (annulation) {
    return (
      <div className="w-64 rounded-net border border-red-300 bg-red-50 p-3 text-left">
        <p className="text-sm text-nuit">
          Annuler le versement de{" "}
          <span className="tabulaire font-semibold">
            {formaterMontant(montant)}
          </span>{" "}
          à <span className="font-semibold">{nom}</span> pour {libelleMois}.
        </p>
        <p className="mt-1.5 text-xs text-ardoise">
          Le bulletin est conservé avec son motif, et le mois redevient à
          verser.
        </p>

        <label htmlFor={`annul-note-${technicienId}`} className="sr-only">
          Motif de l’annulation
        </label>
        <input
          id={`annul-note-${technicienId}`}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          maxLength={300}
          placeholder="Exemple : enregistré sur le mauvais technicien."
          className="mt-3 w-full rounded-net border border-trait bg-white px-3 py-2 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
        />

        {erreur && (
          <div className="mt-2">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Bouton
            taille="petit"
            variante="danger"
            disabled={enCours}
            onClick={envoyer}
          >
            {enCours ? "Annulation…" : "Confirmer l’annulation"}
          </Bouton>
          <Bouton
            taille="petit"
            variante="secondaire"
            onClick={() => {
              setOuvert(false);
              setErreur(null);
            }}
          >
            Revenir
          </Bouton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 rounded-net border border-signal-profond bg-white p-3 text-left">
      <p className="text-sm text-nuit">
        Vous attestez avoir versé{" "}
        <span className="tabulaire font-semibold">{formaterMontant(montant)}</span>{" "}
        à <span className="font-semibold">{nom}</span> pour {libelleMois}.
      </p>
      <p className="mt-1.5 text-xs text-ardoise">
        L’enregistrement est définitif et empêchera de payer ce mois une seconde
        fois.
      </p>

      <label htmlFor={`paie-note-${technicienId}`} className="sr-only">
        Commentaire sur le versement
      </label>
      <input
        id={`paie-note-${technicienId}`}
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        maxLength={300}
        placeholder="Virement, espèces… (facultatif)"
        className="mt-3 w-full rounded-net border border-trait bg-white px-3 py-2 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
      />

      {erreur && (
        <div className="mt-2">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Bouton taille="petit" disabled={enCours} onClick={envoyer}>
          {enCours ? "Enregistrement…" : "Confirmer"}
        </Bouton>
        <Bouton
          taille="petit"
          variante="secondaire"
          onClick={() => {
            setOuvert(false);
            setErreur(null);
          }}
        >
          Annuler
        </Bouton>
      </div>
    </div>
  );
}
