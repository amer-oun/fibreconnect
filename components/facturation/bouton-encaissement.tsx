"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { dinarsEnMillimes, formaterMontant } from "@/lib/monnaie";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * The technician records cash received on site.
 *
 * The field is pre-filled with the full balance, because that is what happens
 * nine times out of ten and a technician holding a phone in one hand should not
 * have to retype a figure the app already knows. It stays editable for the
 * partial payment the tenth time.
 */
export default function BoutonEncaissement({
  factureId,
  resteAPayer,
}: {
  factureId: string;
  resteAPayer: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [dinars, setDinars] = useState(
    (resteAPayer / 1000).toFixed(3).replace(".", ","),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function encaisser() {
    const montant = dinarsEnMillimes(Number(dinars.replace(",", ".")));

    if (!Number.isFinite(montant) || montant <= 0) {
      setErreur("Saisissez le montant reçu, en dinars.");
      return;
    }
    if (montant > resteAPayer) {
      setErreur(
        `Le reste à payer est de ${formaterMontant(resteAPayer)}. Vous ne pouvez pas encaisser plus.`,
      );
      return;
    }

    setErreur(null);
    setEnCours(true);
    const reponse = await fetch(`/api/factures/${factureId}/encaisser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ montant }),
    });
    setEnCours(false);

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(donnees.error ?? "L’encaissement n’a pas pu être enregistré.");
      return;
    }

    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <Bouton taille="petit" onClick={() => setOuvert(true)}>
        Encaisser en espèces
      </Bouton>
    );
  }

  return (
    <div className="w-full sm:w-72">
      <label
        htmlFor={`encaisse-${factureId}`}
        className="text-sm font-medium text-nuit"
      >
        Montant reçu, en dinars
      </label>
      <p className="mt-1 text-xs text-ardoise">
        Cette somme devient une avance que vous devez à la société : remettez-la
        depuis « Ma caisse ».
      </p>
      <input
        id={`encaisse-${factureId}`}
        value={dinars}
        onChange={(e) => setDinars(e.target.value)}
        inputMode="decimal"
        className="mt-2 w-full rounded-net border border-trait bg-white px-3 py-2.5 text-right text-sm text-nuit tabulaire focus:border-signal focus:outline-none"
      />

      {erreur && (
        <div className="mt-2">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Bouton taille="petit" disabled={enCours} onClick={encaisser}>
          {enCours ? "Enregistrement…" : "Enregistrer l’encaissement"}
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
