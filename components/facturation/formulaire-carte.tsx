"use client";

import { useState } from "react";

import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * The card form, shaped exactly like a real one — and deliberately harmless.
 *
 * **The card number never leaves this component.** Nothing is sent to the
 * server, nothing is stored, not even in React state beyond the keystroke: only
 * the brand and the last four digits are handed to the caller. That is what
 * PCI-DSS requires of anyone who is not a certified payment processor, and it
 * is the reason Stripe and Paymee hand you an iframe instead of a text field.
 * A school project that stored a PAN would be a school project that must never
 * be deployed.
 *
 * The validation is real: the Luhn checksum, the expiry date, the CVV length.
 * A wrong number is refused here, exactly as the gateway would refuse it — and
 * that is what makes the screen worth showing.
 */

/** Marque déduite du préfixe, comme le fait n'importe quelle passerelle. */
function marqueDe(numero: string): string | null {
  if (/^4/.test(numero)) return "Visa";
  if (/^5[1-5]/.test(numero) || /^2[2-7]/.test(numero)) return "Mastercard";
  return null;
}

/**
 * Somme de Luhn : la clé de contrôle que porte tout numéro de carte.
 *
 * Elle n'atteste rien sur l'existence du compte — elle attrape la faute de
 * frappe, ce qui est déjà l'essentiel des refus.
 */
function luhnValide(numero: string) {
  let somme = 0;
  let doubler = false;

  for (let i = numero.length - 1; i >= 0; i--) {
    let chiffre = numero.charCodeAt(i) - 48;
    if (doubler) {
      chiffre *= 2;
      if (chiffre > 9) chiffre -= 9;
    }
    somme += chiffre;
    doubler = !doubler;
  }
  return somme % 10 === 0;
}

/** `4242424242424242` → `4242 4242 4242 4242`, au fil de la frappe. */
const grouper = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

export default function FormulaireCarte({
  montantLibelle,
  enCours,
  onValider,
}: {
  montantLibelle: string;
  enCours: boolean;
  /** Reçoit uniquement ce qu'une société a le droit de conserver. */
  onValider: (empreinte: { marque: string; quatreDerniers: string }) => void;
}) {
  const [numero, setNumero] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [porteur, setPorteur] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const chiffres = numero.replace(/\D/g, "");
  const marque = marqueDe(chiffres);

  function valider() {
    if (chiffres.length < 13 || !luhnValide(chiffres)) {
      setErreur("Ce numéro de carte n’est pas valide. Vérifiez les chiffres.");
      return;
    }
    if (!marque) {
      setErreur("Seules les cartes Visa et Mastercard sont acceptées.");
      return;
    }

    const [mm, aa] = expiration.split("/");
    const mois = Number(mm);
    const annee = Number(aa);
    if (!mois || !annee || mois < 1 || mois > 12) {
      setErreur("Date d’expiration attendue au format MM/AA.");
      return;
    }
    // Le mois d'expiration est inclus : une carte 08/26 vaut tout août 2026.
    const finDeValidite = new Date(2000 + annee, mois, 0, 23, 59, 59);
    if (finDeValidite < new Date()) {
      setErreur("Cette carte est expirée.");
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setErreur("Le cryptogramme fait 3 chiffres (4 pour American Express).");
      return;
    }
    if (porteur.trim().length < 3) {
      setErreur("Indiquez le nom inscrit sur la carte.");
      return;
    }

    setErreur(null);
    onValider({ marque, quatreDerniers: chiffres.slice(-4) });
  }

  const champ =
    "w-full rounded-net border border-trait bg-white px-3 py-2.5 text-sm text-nuit tabulaire placeholder:text-brume focus:border-signal focus:outline-none";

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="carte-numero" className="text-sm font-medium text-nuit">
            Numéro de carte
          </label>
          <div className="relative mt-1.5">
            <input
              id="carte-numero"
              value={grouper(chiffres)}
              onChange={(e) => setNumero(e.target.value.slice(0, 23))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="4242 4242 4242 4242"
              className={champ}
            />
            {marque && (
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-ardoise">
                {marque}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="carte-exp" className="text-sm font-medium text-nuit">
              Expiration
            </label>
            <input
              id="carte-exp"
              value={expiration}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                setExpiration(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="MM/AA"
              className={`${champ} mt-1.5`}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="carte-cvv" className="text-sm font-medium text-nuit">
              Cryptogramme
            </label>
            <input
              id="carte-cvv"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="123"
              className={`${champ} mt-1.5`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="carte-porteur" className="text-sm font-medium text-nuit">
            Nom du porteur
          </label>
          <input
            id="carte-porteur"
            value={porteur}
            onChange={(e) => setPorteur(e.target.value)}
            autoComplete="off"
            placeholder="Tel qu’il est inscrit sur la carte"
            className={`${champ} mt-1.5 text-left`}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-ardoise">
        Le numéro saisi ne quitte pas cette page : seuls la marque et les quatre
        derniers chiffres sont conservés avec le règlement. Une société qui n’est
        pas prestataire de paiement agréé n’a pas le droit d’en garder plus.
      </p>

      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-4">
        <Bouton variante="signal" disabled={enCours} onClick={valider}>
          {enCours ? "Traitement…" : `Payer ${montantLibelle}`}
        </Bouton>
      </div>
    </div>
  );
}
