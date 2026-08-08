"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  MOYENS_EN_LIGNE,
  MOYEN_PAIEMENT_DETAILS,
  MOYEN_PAIEMENT_LABELS,
  type MoyenPaiement,
} from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * Payment screen, in the shape of a real gateway.
 *
 * **No money moves here.** Stripe does not accept Tunisian merchants, and the
 * local providers (Paymee, Flouci) need a signed contract this project has no
 * way to obtain. So the gateway step is simulated, and it says so on screen —
 * a payment form that pretends to be real is the one thing that would make this
 * demo dishonest.
 *
 * What is kept is the *shape*: intent, then confirmation, two round trips. The
 * day a real provider is plugged in, the confirmation arrives from a webhook
 * instead of from this button, and nothing else in the flow changes.
 */

type Etape =
  | { nom: "choix" }
  | { nom: "passerelle"; reference: string; moyen: MoyenPaiement; montant: number }
  | { nom: "virement"; reference: string; montant: number };

export default function FormulairePaiement({
  factureId,
  resteAPayer,
}: {
  factureId: string;
  resteAPayer: number;
}) {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>({ nom: "choix" });
  const [moyen, setMoyen] = useState<MoyenPaiement>("CARTE");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function appeler(url: string, corps?: unknown) {
    setErreur(null);
    setEnCours(true);
    const reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps ?? {}),
    });
    setEnCours(false);

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(donnees.error ?? "Le paiement n’a pas pu être enregistré.");
      return null;
    }
    return (await reponse.json()).data;
  }

  async function ouvrir() {
    const data = await appeler(`/api/factures/${factureId}/payer`, { moyen });
    if (!data) return;

    setEtape(
      moyen === "VIREMENT"
        ? { nom: "virement", reference: data.reference, montant: data.montant }
        : {
            nom: "passerelle",
            reference: data.reference,
            moyen,
            montant: data.montant,
          },
    );
  }

  async function confirmer(reference: string) {
    const data = await appeler(`/api/paiements/${reference}/confirmer`);
    if (!data) return;
    router.refresh();
  }

  async function abandonner(reference: string) {
    await appeler(`/api/paiements/${reference}/echouer`);
    setEtape({ nom: "choix" });
    router.refresh();
  }

  /* -- Virement : rien à confirmer ici, la société le verra sur son compte -- */

  if (etape.nom === "virement") {
    return (
      <div className="rounded-net border border-signal-profond bg-white p-4">
        <p className="font-display text-sm font-semibold text-nuit">
          Virement de {formaterMontant(etape.montant)} à effectuer
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ardoise">Bénéficiaire</dt>
            <dd className="text-right font-medium text-nuit">FibreConnect SARL</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ardoise">Référence à indiquer</dt>
            <dd className="text-right font-mono text-nuit">{etape.reference}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ardoise">
          Votre facture reste « à payer » jusqu’à la réception du virement sur
          le compte de la société, qui la soldera. Comptez un à trois jours
          ouvrés.
        </p>
      </div>
    );
  }

  /* -- Carte et D17 : passerelle simulée ---------------------------------- */

  if (etape.nom === "passerelle") {
    return (
      <div className="rounded-net border border-signal-profond bg-white p-4">
        <p className="eyebrow">Passerelle de paiement — simulation</p>
        <p className="mt-2 text-sm text-nuit">
          Paiement de{" "}
          <span className="tabulaire font-semibold">
            {formaterMontant(etape.montant)}
          </span>{" "}
          par {MOYEN_PAIEMENT_LABELS[etape.moyen].toLowerCase()}, référence{" "}
          <span className="font-mono text-xs">{etape.reference}</span>.
        </p>
        <p className="mt-2 text-xs text-ardoise">
          Aucun argent ne circule : cette étape remplace la page du prestataire
          bancaire, qui n’est pas raccordé dans cette version.
        </p>

        {erreur && (
          <div className="mt-3">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Bouton
            variante="signal"
            disabled={enCours}
            onClick={() => confirmer(etape.reference)}
          >
            {enCours ? "Traitement…" : "Confirmer le paiement"}
          </Bouton>
          <Bouton
            variante="secondaire"
            disabled={enCours}
            onClick={() => abandonner(etape.reference)}
          >
            Abandonner
          </Bouton>
        </div>
      </div>
    );
  }

  /* -- Choix du moyen ------------------------------------------------------ */

  return (
    <div>
      <fieldset>
        <legend className="text-sm font-medium text-nuit">
          Comment souhaitez-vous régler {formaterMontant(resteAPayer)} ?
        </legend>
        <div className="mt-3 space-y-2">
          {MOYENS_EN_LIGNE.map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer gap-3 rounded-net border p-3 ${
                moyen === m
                  ? "border-signal-profond bg-white"
                  : "border-trait bg-white hover:border-ardoise"
              }`}
            >
              <input
                type="radio"
                name="moyen"
                value={m}
                checked={moyen === m}
                onChange={() => setMoyen(m)}
                className="mt-0.5 accent-signal-profond"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-nuit">
                  {MOYEN_PAIEMENT_LABELS[m]}
                </span>
                <span className="mt-0.5 block text-xs text-ardoise">
                  {MOYEN_PAIEMENT_DETAILS[m]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-3 text-xs text-ardoise">
        Vous pouvez aussi régler en espèces au technicien lors de son passage :
        c’est lui qui enregistre l’encaissement, et le reçu apparaît ici.
      </p>

      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-4">
        <Bouton variante="signal" disabled={enCours} onClick={ouvrir}>
          {enCours ? "Ouverture…" : `Payer ${formaterMontant(resteAPayer)}`}
        </Bouton>
      </div>
    </div>
  );
}
