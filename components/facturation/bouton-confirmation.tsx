"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";

/**
 * Confirmation d'une entrée d'argent par le superviseur : une remise
 * d'espèces reçue, un virement vu sur le compte.
 *
 * Volontairement le même bouton pour les deux : dans les deux cas il s'agit
 * d'attester qu'un mouvement a bien eu lieu hors de l'application. La route
 * appelée diffère, le geste et sa portée sont identiques.
 */
export default function BoutonConfirmation({
  url,
  libelle,
  libelleEnCours = "Confirmation…",
}: {
  url: string;
  libelle: string;
  libelleEnCours?: string;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const reponse = await fetch(url, { method: "POST" });
    setEnCours(false);

    if (!reponse.ok) {
      const donnees = await reponse.json().catch(() => ({}));
      setErreur(donnees.error ?? "L’action n’a pas pu être enregistrée.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Bouton taille="petit" disabled={enCours} onClick={confirmer}>
        {enCours ? libelleEnCours : libelle}
      </Bouton>
      {erreur && (
        <p role="alert" className="text-xs text-critique">
          {erreur}
        </p>
      )}
    </div>
  );
}
