"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";

/**
 * Actions du superviseur sur un compte technicien.
 *
 * Trois états, trois gestes différents :
 *   - `EN_ATTENTE` → valider, ce qui demande un matricule (voir `FormulaireValidation`) ;
 *   - `ACTIF` → désactiver, avec confirmation ;
 *   - `DESACTIVE` → réactiver.
 *
 * Un compte désactivé ne peut plus se connecter (règle métier 6). Le
 * superviseur peut désactiver qui il veut — le cahier des charges le lui
 * accorde sans condition — donc les interventions ouvertes sont un
 * avertissement dans la confirmation, jamais un refus.
 */
export default function BasculeCompte({
  technicienId,
  statutCompte,
  nom,
  interventionsOuvertes = 0,
}: {
  technicienId: string;
  statutCompte: string;
  nom: string;
  interventionsOuvertes?: number;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // La validation demande un matricule : elle a son propre formulaire, sur la
  // fiche du technicien. Ici on renvoie vers lui plutôt que de dupliquer.
  if (statutCompte === "EN_ATTENTE") {
    return (
      <a
        href={`/superviseur/techniciens/${technicienId}`}
        className="inline-flex items-center justify-center gap-2 rounded-net border border-signal-profond bg-signal-profond px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-nuit hover:bg-nuit pointer-coarse:min-h-11 pointer-coarse:px-3.5"
      >
        Examiner la demande
      </a>
    );
  }

  const actif = statutCompte === "ACTIF";

  async function basculer() {
    if (actif) {
      const avertissement =
        interventionsOuvertes > 0
          ? `\n\nAttention : ${interventionsOuvertes} intervention${
              interventionsOuvertes > 1
                ? "s lui sont encore affectées"
                : " lui est encore affectée"
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
      body: JSON.stringify({ statutCompte: actif ? "DESACTIVE" : "ACTIF" }),
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
