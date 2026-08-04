"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";

/**
 * Enable / disable a technician account.
 *
 * A disabled account can no longer log in (business rule 6). The supervisor
 * may disable anyone — the brief grants that unconditionally — so open work
 * is a warning in the confirmation, not a refusal.
 */
export default function BasculeCompte({
  technicienId,
  actif,
  nom,
  interventionsOuvertes = 0,
}: {
  technicienId: string;
  actif: boolean;
  nom: string;
  interventionsOuvertes?: number;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function basculer() {
    if (actif) {
      const avertissement =
        interventionsOuvertes > 0
          ? `\n\nAttention : ${interventionsOuvertes} intervention${
              interventionsOuvertes > 1 ? "s lui sont encore affectées" : " lui est encore affectée"
            }. Pensez à ${interventionsOuvertes > 1 ? "les" : "la"} réaffecter depuis la page Interventions.`
          : "";

      if (
        !window.confirm(
          `Désactiver le compte de ${nom} ?\n\nCette personne ne pourra plus se connecter à l’application.${avertissement}`,
        )
      ) {
        return;
      }
    }

    setErreur(null);
    setEnCours(true);

    const reponse = await fetch(`/api/techniciens/${technicienId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !actif }),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "L’opération a échoué.");
      setEnCours(false);
      return;
    }

    setEnCours(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5 md:items-end">
      <Bouton
        taille="petit"
        variante={actif ? "danger" : "principal"}
        disabled={enCours}
        onClick={basculer}
      >
        {enCours ? "…" : actif ? "Désactiver le compte" : "Réactiver le compte"}
      </Bouton>

      {actif && interventionsOuvertes > 0 && (
        <p className="max-w-64 text-right text-xs text-brume">
          {interventionsOuvertes} intervention
          {interventionsOuvertes > 1 ? "s" : ""} en cours
        </p>
      )}

      {erreur && (
        <p
          role="alert"
          className="max-w-64 rounded-net border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700"
        >
          {erreur}
        </p>
      )}
    </div>
  );
}
