"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NOTE_MAX } from "@/lib/constants";
import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

const APPRECIATIONS = [
  "Très insatisfait",
  "Insatisfait",
  "Correct",
  "Satisfait",
  "Très satisfait",
];

/** Notation d'une intervention terminée. Une seule fois, sans retour arrière. */
export default function FormulaireNotation({
  interventionId,
}: {
  interventionId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const affichee = survol || note;

  async function envoyer() {
    if (note === 0) return;
    setErreur(null);
    setEnCours(true);

    const reponse = await fetch(
      `/api/interventions/${interventionId}/noter`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      },
    );

    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => ({}));
      setErreur(corps.error ?? "La note n’a pas pu être enregistrée.");
      setEnCours(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="p-5">
      <p className="text-sm text-ardoise">
        Votre ligne est rétablie. Comment s’est passée l’intervention ?
      </p>

      <div
        className="mt-4 flex items-center gap-3"
        onMouseLeave={() => setSurvol(0)}
      >
        <div role="radiogroup" aria-label="Note de l’intervention" className="flex gap-1">
          {Array.from({ length: NOTE_MAX }).map((_, index) => {
            const valeur = index + 1;
            return (
              <button
                key={valeur}
                type="button"
                role="radio"
                aria-checked={note === valeur}
                aria-label={`${valeur} sur ${NOTE_MAX} — ${APPRECIATIONS[index]}`}
                onClick={() => setNote(valeur)}
                onMouseEnter={() => setSurvol(valeur)}
                onFocus={() => setSurvol(valeur)}
                onBlur={() => setSurvol(0)}
                className="rounded-net p-0.5"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className={`size-8 transition-colors duration-150 ${
                    valeur <= affichee ? "text-alerte" : "text-trait"
                  }`}
                  fill="currentColor"
                >
                  <path d="M10 1.6l2.47 5.29 5.53.72-4.08 3.9 1.05 5.68L10 14.5l-4.97 2.69 1.05-5.68L2 7.61l5.53-.72z" />
                </svg>
              </button>
            );
          })}
        </div>

        <p className="text-sm font-medium text-nuit">
          {affichee > 0 ? APPRECIATIONS[affichee - 1] : ""}
        </p>
      </div>

      {erreur && (
        <div className="mt-4">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <div className="mt-5">
        <Bouton onClick={envoyer} disabled={note === 0 || enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer ma note"}
        </Bouton>
        <p className="mt-2 text-xs text-brume">
          La note ne peut être donnée qu’une seule fois.
        </p>
      </div>
    </div>
  );
}
