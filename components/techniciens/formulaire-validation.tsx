"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { OPTIONS_ZONE } from "@/lib/constants";
import { Bouton } from "@/components/ui/bouton";
import { ChampSelect, ChampTexte, MessageErreur } from "@/components/ui/champs";

/**
 * Validation d'un technicien qui s'est inscrit lui-même.
 *
 * Le matricule et la zone partent ensemble avec l'ouverture du compte : ce
 * sont les deux choses que le candidat ne pouvait pas décider seul, et les
 * séparer laisserait exister un compte actif sans identifiant.
 */
export default function FormulaireValidation({
  technicienId,
  nom,
  zoneProposee,
}: {
  technicienId: string;
  nom: string;
  /** Zone demandée à l'inscription, que le superviseur peut corriger. */
  zoneProposee: string;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);

    const donnees = Object.fromEntries(
      new FormData(evenement.currentTarget).entries(),
    );

    const reponse = await fetch(`/api/techniciens/${technicienId}/valider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donnees),
    });

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "La validation a échoué.");
      setEnCours(false);
      return;
    }

    setEnCours(false);
    router.refresh();
  }

  async function refuser() {
    if (
      !window.confirm(
        `Refuser la candidature de ${nom} ?\n\nLe compte restera enregistré mais désactivé. Vous pourrez le réactiver plus tard.`,
      )
    ) {
      return;
    }

    setErreur(null);
    setEnCours(true);

    const reponse = await fetch(`/api/techniciens/${technicienId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statutCompte: "DESACTIVE" }),
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
    <form onSubmit={envoyer} className="flex flex-col gap-4 p-5" noValidate>
      <p className="text-sm text-ardoise">
        Cette personne s’est inscrite elle-même et ne peut pas encore se
        connecter. Attribuez-lui un matricule pour ouvrir son compte.
      </p>

      <ChampTexte
        id="matricule"
        label="Matricule"
        required
        placeholder="FC-006"
        indication="Identifiant interne, unique. Il apparaît sur ses rapports d’intervention."
      />

      <ChampSelect
        id="zone"
        label="Zone d’intervention"
        required
        defaultValue={zoneProposee}
        options={OPTIONS_ZONE}
        indication={`Zone demandée à l’inscription : ${zoneProposee}. Vous pouvez la corriger.`}
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      <div className="flex flex-wrap gap-2 border-t border-trait pt-4">
        <Bouton type="submit" taille="petit" disabled={enCours}>
          {enCours ? "Validation…" : "Valider et activer le compte"}
        </Bouton>
        <Bouton
          type="button"
          taille="petit"
          variante="danger"
          disabled={enCours}
          onClick={refuser}
        >
          Refuser
        </Bouton>
      </div>
    </form>
  );
}
