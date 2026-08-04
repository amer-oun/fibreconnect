"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ChampPhoto from "@/components/ui/champ-photo";
import { MessageErreur, MessageSucces } from "@/components/ui/champs";

/**
 * Uploads an operator's logo and saves it immediately.
 *
 * No "save" button on purpose: there is exactly one field, and a lone button
 * next to a lone picker is a step that only exists to be clicked.
 */
export default function FormulaireLogo({
  operateurId,
  nom,
  logoUrl,
}: {
  operateurId: string;
  nom: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function enregistrer(chemin: string | null) {
    setErreur(null);
    setSucces(false);

    const reponse = await fetch(`/api/operateurs/${operateurId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: chemin }),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "Le logo n’a pas pu être enregistré.");
      return;
    }

    setSucces(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ChampPhoto
        id={`logo-${operateurId}`}
        label={`Logo ${nom}`}
        indication="PNG ou WebP sur fond transparent, 5 Mo maximum."
        valeur={logoUrl}
        onChange={enregistrer}
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      {succes && <MessageSucces>Le logo est à jour.</MessageSucces>}
    </div>
  );
}
