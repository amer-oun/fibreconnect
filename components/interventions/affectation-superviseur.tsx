"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

export type TechnicienAffectable = {
  id: string;
  nom: string;
  matricule: string;
  zone: string;
  operateurId: string;
  disponible: boolean;
  chargeEnCours: number;
};

/**
 * Manual assignment by the supervisor.
 *
 * The dropdown only lists technicians of the subscriber's own operator — the
 * API enforces the same rule, so narrowing the list here is a convenience,
 * not the control.
 */
export default function AffectationSuperviseur({
  interventionId,
  operateurId,
  technicienActuelId,
  techniciens,
  statut,
}: {
  interventionId: string;
  operateurId: string;
  technicienActuelId: string | null;
  techniciens: TechnicienAffectable[];
  statut: string;
}) {
  const router = useRouter();
  const [choix, setChoix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const eligibles = techniciens.filter(
    (t) => t.operateurId === operateurId && t.id !== technicienActuelId,
  );

  const terminal = statut === "TERMINEE" || statut === "ANNULEE";

  if (terminal) {
    return (
      <p className="text-xs text-brume italic">
        Intervention clôturée — plus d’affectation possible.
      </p>
    );
  }

  async function affecter() {
    if (!choix) return;
    setErreur(null);
    setEnCours(true);

    const reponse = await fetch(
      `/api/interventions/${interventionId}/assigner`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicienId: choix }),
      },
    );

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "L’affectation a échoué.");
      setEnCours(false);
      return;
    }

    setChoix("");
    setEnCours(false);
    router.refresh();
  }

  if (eligibles.length === 0) {
    return (
      <p className="text-xs text-brume italic">
        Aucun autre technicien disponible chez cet opérateur.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`affecter-${interventionId}`} className="sr-only">
          Choisir un technicien
        </label>
        <select
          id={`affecter-${interventionId}`}
          value={choix}
          onChange={(e) => setChoix(e.target.value)}
          className="max-w-56 rounded-net border border-trait bg-white px-2.5 py-1.5 text-xs text-nuit focus:border-signal focus:outline-none"
        >
          <option value="">
            {technicienActuelId ? "Réaffecter à…" : "Affecter à…"}
          </option>
          {eligibles.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom} · {t.zone} · {t.chargeEnCours} en cours
              {t.disponible ? "" : " (indisponible)"}
            </option>
          ))}
        </select>

        <Bouton
          taille="petit"
          disabled={!choix || enCours}
          onClick={affecter}
        >
          {enCours ? "…" : technicienActuelId ? "Réaffecter" : "Affecter"}
        </Bouton>
      </div>

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
    </div>
  );
}
