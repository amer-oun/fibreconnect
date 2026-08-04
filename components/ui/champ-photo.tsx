"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Photo picker with an inline preview.
 *
 * `capture="environment"` makes a phone open the rear camera directly, which
 * is what both an subscriber pointing at their box and a technician standing
 * at a junction box actually want.
 */
export default function ChampPhoto({
  id,
  label,
  indication,
  valeur,
  onChange,
}: {
  id: string;
  label: string;
  indication?: string;
  valeur: string | null;
  onChange: (chemin: string | null) => void;
}) {
  const entree = useRef<HTMLInputElement>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(fichier: File) {
    setErreur(null);
    setEnvoiEnCours(true);

    const corps = new FormData();
    corps.append("fichier", fichier);

    const reponse = await fetch("/api/televersement", {
      method: "POST",
      body: corps,
    });
    const donnees = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      setErreur(donnees.error ?? "L’envoi de la photo a échoué.");
      setEnvoiEnCours(false);
      return;
    }

    onChange(donnees.data.chemin);
    setEnvoiEnCours(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-nuit">
        {label}
      </label>
      {indication && <p className="text-xs text-ardoise">{indication}</p>}

      <input
        ref={entree}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) envoyer(fichier);
        }}
      />

      {valeur ? (
        <div className="flex items-start gap-3">
          <Image
            src={valeur}
            alt="Aperçu de la photo jointe"
            width={112}
            height={112}
            className="size-28 rounded-net border border-trait object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (entree.current) entree.current.value = "";
            }}
            className="rounded-net border border-trait bg-white px-2.5 py-1.5 text-xs text-nuit transition-colors hover:border-ardoise"
          >
            Retirer la photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={envoiEnCours}
          onClick={() => entree.current?.click()}
          className="flex items-center justify-center gap-2 rounded-net border border-dashed border-trait bg-white px-4 py-6 text-sm text-ardoise transition-colors hover:border-ardoise hover:text-nuit disabled:opacity-60"
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 15V7a1 1 0 011-1h2.5L8 4h4l1.5 2H16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
            <circle cx="10" cy="10.5" r="2.5" />
          </svg>
          {envoiEnCours ? "Envoi en cours…" : "Ajouter une photo"}
        </button>
      )}

      {erreur && (
        <p role="alert" className="text-xs text-critique">
          {erreur}
        </p>
      )}
    </div>
  );
}
