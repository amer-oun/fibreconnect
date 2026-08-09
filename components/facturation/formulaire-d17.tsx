"use client";

import { useState } from "react";

import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * D17 payment, the way La Poste tunisienne actually runs it.
 *
 * The subscriber enters the phone number tied to their D17 wallet; the
 * provider sends a one-time code to that number, and the payment goes through
 * only once the code comes back. Two steps, because the second one is the whole
 * security of the scheme — collapsing them would be showing a flow that does
 * not exist.
 *
 * Here the code is generated in the browser and displayed, since no SMS is
 * sent. That is the one place the simulation shows through, and it says so.
 */
export default function FormulaireD17({
  montantLibelle,
  enCours,
  onValider,
}: {
  montantLibelle: string;
  enCours: boolean;
  onValider: (telephone: string) => void;
}) {
  const [telephone, setTelephone] = useState("");
  const [envoye, setEnvoye] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const champ =
    "mt-1.5 w-full rounded-net border border-trait bg-white px-3 py-2.5 text-sm text-nuit tabulaire placeholder:text-brume focus:border-signal focus:outline-none";

  function demanderLeCode() {
    const chiffres = telephone.replace(/\D/g, "");
    if (chiffres.length < 8) {
      setErreur("Saisissez le numéro de téléphone associé à votre compte D17.");
      return;
    }
    setErreur(null);
    setEnvoye(String(Math.floor(100000 + Math.random() * 900000)));
  }

  if (envoye) {
    return (
      <div>
        <label htmlFor="d17-code" className="text-sm font-medium text-nuit">
          Code reçu par SMS
        </label>
        <p className="mt-1 text-xs text-ardoise">
          Aucun SMS n’est envoyé dans cette version. Le code à saisir est{" "}
          <span className="font-mono font-semibold text-nuit">{envoye}</span>.
        </p>
        <input
          id="d17-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className={champ}
        />

        {erreur && (
          <div className="mt-3">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Bouton
            variante="signal"
            disabled={enCours}
            onClick={() => {
              if (code !== envoye) {
                setErreur("Code incorrect.");
                return;
              }
              setErreur(null);
              onValider(telephone);
            }}
          >
            {enCours ? "Traitement…" : `Payer ${montantLibelle}`}
          </Bouton>
          <Bouton
            taille="petit"
            variante="secondaire"
            onClick={() => {
              setEnvoye(null);
              setCode("");
              setErreur(null);
            }}
          >
            Changer de numéro
          </Bouton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="d17-tel" className="text-sm font-medium text-nuit">
        Numéro de téléphone D17
      </label>
      <p className="mt-1 text-xs text-ardoise">
        Celui rattaché à votre compte e-Dinar. Un code de confirmation y est
        envoyé avant tout débit.
      </p>
      <input
        id="d17-tel"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        placeholder="+216 20 000 000"
        className={champ}
      />

      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-4">
        <Bouton variante="signal" onClick={demanderLeCode}>
          Recevoir le code
        </Bouton>
      </div>
    </div>
  );
}
