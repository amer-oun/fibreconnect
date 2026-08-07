"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { OPTIONS_ZONE } from "@/lib/constants";
import { Bouton } from "@/components/ui/bouton";
import {
  ChampSelect,
  MessageErreur,
  MessageSucces,
} from "@/components/ui/champs";

/**
 * Changement de secteur par le superviseur.
 *
 * Le technicien ne peut pas le faire lui-même : la zone décide des pannes qui
 * lui sont proposées, la choisir reviendrait à choisir son travail.
 */
export default function FormulaireZone({
  technicienId,
  zone,
}: {
  technicienId: string;
  zone: string;
}) {
  const router = useRouter();
  const [choix, setChoix] = useState(zone);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);

    const reponse = await fetch(`/api/techniciens/${technicienId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zone: choix }),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "Le changement de zone a échoué.");
      setEnCours(false);
      return;
    }

    setSucces(true);
    setEnCours(false);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4 p-5" noValidate>
      <ChampSelect
        id={`zone-${technicienId}`}
        label="Zone d’intervention"
        value={choix}
        onChange={(e) => setChoix(e.target.value)}
        options={OPTIONS_ZONE}
        indication="Les pannes de cette zone lui seront proposées. Ses interventions en cours ne changent pas."
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      {succes && <MessageSucces>La zone est à jour.</MessageSucces>}

      <div>
        <Bouton
          type="submit"
          taille="petit"
          disabled={enCours || choix === zone}
        >
          {enCours ? "Enregistrement…" : "Changer la zone"}
        </Bouton>
      </div>
    </form>
  );
}
