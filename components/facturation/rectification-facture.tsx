"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { dinarsEnMillimes, formaterMontant } from "@/lib/monnaie";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * The supervisor's two escape hatches on an unpaid invoice.
 *
 * Correcting and cancelling sit in one component because they are the same
 * decision seen from two ends — "this invoice is wrong" — and because putting
 * them side by side makes the difference legible: correcting keeps a debt,
 * cancelling erases it. Both demand a written reason, which the subscriber
 * reads on their own copy.
 */

type SaisieLigne = { designation: string; dinars: string };

export default function RectificationFacture({
  factureId,
  lignes: lignesInitiales,
}: {
  factureId: string;
  lignes: ReadonlyArray<{ designation: string; montant: number }>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"ferme" | "correction" | "annulation">("ferme");
  const [motif, setMotif] = useState("");
  const [lignes, setLignes] = useState<SaisieLigne[]>(() =>
    lignesInitiales.map((l) => ({
      designation: l.designation,
      dinars: (l.montant / 1000).toFixed(3).replace(".", ","),
    })),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const retenues = lignes
    .map((l) => ({
      designation: l.designation.trim(),
      montant: dinarsEnMillimes(Number(l.dinars.replace(",", "."))),
    }))
    .filter(
      (l) => l.designation !== "" && Number.isFinite(l.montant) && l.montant > 0,
    );
  const total = retenues.reduce((s, l) => s + l.montant, 0);

  async function envoyer(methode: "PATCH" | "DELETE") {
    if (motif.trim().length < 10) {
      setErreur(
        "Expliquez la rectification en 10 caractères minimum : l’abonné lira ce motif.",
      );
      return;
    }
    if (methode === "PATCH" && retenues.length !== lignes.length) {
      setErreur(
        "Une ligne n’a pas de désignation ou pas de montant. Complétez-la ou retirez-la.",
      );
      return;
    }

    setErreur(null);
    setEnCours(true);
    const reponse = await fetch(`/api/factures/${factureId}/rectifier`, {
      method: methode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        methode === "PATCH"
          ? { motif: motif.trim(), lignes: retenues }
          : { motif: motif.trim() },
      ),
    });
    setEnCours(false);

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(donnees.error ?? "La rectification n’a pas pu être enregistrée.");
      return;
    }

    setMode("ferme");
    setMotif("");
    router.refresh();
  }

  if (mode === "ferme") {
    return (
      <div className="flex flex-wrap gap-2">
        <Bouton variante="secondaire" onClick={() => setMode("correction")}>
          Corriger la facture
        </Bouton>
        <Bouton variante="danger" onClick={() => setMode("annulation")}>
          Annuler la facture
        </Bouton>
      </div>
    );
  }

  const champMotif = (
    <div className="mt-4">
      <label htmlFor="motif-rectif" className="text-sm font-medium text-nuit">
        Motif
      </label>
      <p className="mt-1 text-xs text-ardoise">
        Ce texte apparaît sur la facture de l’abonné, à côté du nouveau montant.
      </p>
      <input
        id="motif-rectif"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        maxLength={300}
        placeholder={
          mode === "annulation"
            ? "Exemple : intervention sous garantie, aucun montant dû."
            : "Exemple : routeur facturé 2100 DT au lieu de 210 DT."
        }
        className="mt-2 w-full rounded-net border border-trait bg-white px-3 py-2.5 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
      />
    </div>
  );

  if (mode === "annulation") {
    return (
      <div className="rounded-net border border-red-300 bg-red-50 p-4">
        <p className="font-display text-sm font-semibold text-nuit">
          Annuler cette facture
        </p>
        <p className="mt-1 text-sm text-ardoise">
          L’abonné ne devra plus rien. C’est le geste du « rien à facturer » —
          garantie, geste commercial. <strong>Il est définitif</strong> :
          l’intervention n’en recevra pas de nouvelle. Pour une erreur de
          montant, corrigez plutôt la facture.
        </p>

        {champMotif}

        {erreur && (
          <div className="mt-3">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Bouton
            variante="danger"
            disabled={enCours}
            onClick={() => envoyer("DELETE")}
          >
            {enCours ? "Annulation…" : "Confirmer l’annulation"}
          </Bouton>
          <Bouton
            variante="secondaire"
            onClick={() => {
              setMode("ferme");
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
    <div className="rounded-net border border-signal-profond bg-white p-4">
      <p className="font-display text-sm font-semibold text-nuit">
        Corriger les lignes de la facture
      </p>
      <p className="mt-1 text-sm text-ardoise">
        Le montant dû sera recalculé à partir des lignes ci-dessous.
      </p>

      <div className="mt-3 space-y-2">
        {lignes.map((ligne, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`rectif-lib-${index}`} className="sr-only">
                Désignation de la ligne {index + 1}
              </label>
              <input
                id={`rectif-lib-${index}`}
                value={ligne.designation}
                onChange={(e) =>
                  setLignes((liste) =>
                    liste.map((l, i) =>
                      i === index ? { ...l, designation: e.target.value } : l,
                    ),
                  )
                }
                maxLength={80}
                className="w-full rounded-net border border-trait bg-white px-3 py-2 text-sm text-nuit focus:border-signal focus:outline-none"
              />
            </div>
            <div className="w-28">
              <label htmlFor={`rectif-mnt-${index}`} className="sr-only">
                Montant de la ligne {index + 1}, en dinars
              </label>
              <input
                id={`rectif-mnt-${index}`}
                value={ligne.dinars}
                onChange={(e) =>
                  setLignes((liste) =>
                    liste.map((l, i) =>
                      i === index ? { ...l, dinars: e.target.value } : l,
                    ),
                  )
                }
                inputMode="decimal"
                className="w-full rounded-net border border-trait bg-white px-3 py-2 text-right text-sm text-nuit tabulaire focus:border-signal focus:outline-none"
              />
            </div>
            <Bouton
              taille="petit"
              variante="discret"
              disabled={lignes.length === 1}
              onClick={() =>
                setLignes((liste) => liste.filter((_, i) => i !== index))
              }
            >
              Retirer
            </Bouton>
          </div>
        ))}
      </div>

      {lignes.length < 12 && (
        <div className="mt-3">
          <Bouton
            taille="petit"
            variante="secondaire"
            onClick={() =>
              setLignes((liste) => [...liste, { designation: "", dinars: "" }])
            }
          >
            Ajouter une ligne
          </Bouton>
        </div>
      )}

      <div className="mt-3 flex justify-between gap-4 border-t border-trait pt-2 text-sm">
        <span className="font-semibold text-nuit">Nouveau total</span>
        <span className="tabulaire font-display font-bold text-nuit">
          {formaterMontant(total)}
        </span>
      </div>

      {champMotif}

      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Bouton disabled={enCours} onClick={() => envoyer("PATCH")}>
          {enCours ? "Enregistrement…" : "Enregistrer la correction"}
        </Bouton>
        <Bouton
          variante="secondaire"
          onClick={() => {
            setMode("ferme");
            setErreur(null);
          }}
        >
          Revenir
        </Bouton>
      </div>
    </div>
  );
}
