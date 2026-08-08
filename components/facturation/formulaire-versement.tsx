"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formaterMontant } from "@/lib/monnaie";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * The technician declares handing the cash back to the company.
 *
 * No amount to type: the server totals what is still in hand and remits all of
 * it. A free field would let someone declare 200 DT while holding 400, and no
 * later check could tell the difference.
 */
export default function FormulaireVersement({
  montant,
}: {
  /** Espèces détenues, en millimes. */
  montant: number;
}) {
  const router = useRouter();
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function declarer() {
    setErreur(null);
    setEnCours(true);
    const reponse = await fetch("/api/versements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentaire: commentaire.trim() || undefined }),
    });
    setEnCours(false);

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(donnees.error ?? "La remise n’a pas pu être enregistrée.");
      return;
    }

    setCommentaire("");
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="versement-note" className="text-sm font-medium text-nuit">
        Remettre {formaterMontant(montant)} à la société
      </label>
      <p className="mt-1 text-xs text-ardoise">
        Vous déclarez avoir remis la totalité des espèces que vous détenez. Le
        superviseur confirmera les avoir reçues.
      </p>
      <input
        id="versement-note"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        maxLength={300}
        placeholder="Remise à qui, où (facultatif)"
        className="mt-2 w-full rounded-net border border-trait bg-white px-3 py-2.5 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
      />

      {erreur && (
        <div className="mt-2">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-3">
        <Bouton disabled={enCours} onClick={declarer}>
          {enCours ? "Enregistrement…" : "Déclarer la remise"}
        </Bouton>
      </div>
    </div>
  );
}
