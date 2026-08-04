"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

/**
 * Cancelling an intervention.
 *
 * Available to the subscriber who declared it and to the supervisor, never to
 * a technician. Only meaningful before closure — the API refuses the rest.
 */
export default function BoutonAnnulation({
  interventionId,
  statut,
  role,
}: {
  interventionId: string;
  statut: string;
  role: "CLIENT" | "SUPERVISEUR";
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // TERMINEE et ANNULEE sont des états terminaux.
  if (statut === "TERMINEE" || statut === "ANNULEE") return null;

  async function annuler() {
    setErreur(null);
    setEnCours(true);

    const reponse = await fetch(
      `/api/interventions/${interventionId}/annuler`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif: motif.trim() || undefined }),
      },
    );

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "L’annulation a échoué.");
      setEnCours(false);
      return;
    }

    setEnCours(false);
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <Bouton
        variante="danger"
        taille="petit"
        onClick={() => setOuvert(true)}
        className="sans-impression"
      >
        {role === "CLIENT" ? "Annuler ma demande" : "Annuler l’intervention"}
      </Bouton>
    );
  }

  return (
    <div className="sans-impression w-full md:w-80">
      <label
        htmlFor={`motif-${interventionId}`}
        className="text-sm font-medium text-nuit"
      >
        Pourquoi annuler ?
      </label>
      <p className="mt-1 text-xs text-ardoise">
        {role === "CLIENT"
          ? "Facultatif, mais cela aide le technicien à comprendre."
          : "Facultatif. Le motif apparaît dans l’historique de l’intervention."}
      </p>
      <input
        id={`motif-${interventionId}`}
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        maxLength={300}
        placeholder={
          role === "CLIENT"
            ? "Exemple : le problème s’est résolu tout seul"
            : "Exemple : doublon avec une autre demande"
        }
        className="mt-2 w-full rounded-net border border-trait bg-white px-3 py-2 text-sm text-nuit placeholder:text-brume focus:border-signal focus:outline-none"
      />

      {erreur && (
        <div className="mt-2">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Bouton
          variante="danger"
          taille="petit"
          disabled={enCours}
          onClick={annuler}
        >
          {enCours ? "Annulation…" : "Confirmer l’annulation"}
        </Bouton>
        <Bouton
          variante="secondaire"
          taille="petit"
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
