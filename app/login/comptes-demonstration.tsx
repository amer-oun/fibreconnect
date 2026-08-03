"use client";

import { useState } from "react";

/**
 * Demo credentials panel, shown only when NEXT_PUBLIC_MODE_DEMO is on.
 * It exists so a reviewer can open any of the three spaces without being
 * handed a sheet of paper; set the flag to "false" for a real deployment.
 */

const COMPTES = [
  {
    groupe: "Superviseur",
    lignes: [{ email: "superviseur@fibreconnect.tn", detail: "Leila Ben Salah" }],
  },
  {
    groupe: "Techniciens",
    lignes: [
      { email: "karim.bouazizi@fibreconnect.tn", detail: "Tunisie Telecom · Tunis" },
      { email: "sonia.trabelsi@fibreconnect.tn", detail: "Tunisie Telecom · Ariana" },
      { email: "mehdi.gharbi@fibreconnect.tn", detail: "Ooredoo · Ben Arous" },
      { email: "amine.jlassi@fibreconnect.tn", detail: "Orange · Sfax" },
    ],
  },
  {
    groupe: "Clients",
    lignes: [
      { email: "nadia.chaabane@example.tn", detail: "Tunisie Telecom · Tunis" },
      { email: "slim.ferchichi@example.tn", detail: "Ooredoo · Ben Arous" },
      { email: "hatem.zouari@example.tn", detail: "Orange · Sfax" },
    ],
  },
];

export default function ComptesDemonstration() {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);

  async function copier(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopie(email);
      setTimeout(() => setCopie(null), 1800);
    } catch {
      // Presse-papiers refusé par le navigateur : l'adresse reste sélectionnable.
    }
  }

  return (
    <div className="mt-6 rounded-bloc border border-nuit-700">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-brume">
          Comptes de démonstration
        </span>
        <span aria-hidden className="font-mono text-xs text-ardoise">
          {ouvert ? "—" : "+"}
        </span>
      </button>

      {ouvert && (
        <div className="border-t border-nuit-700 px-4 py-4">
          <p className="mb-4 text-xs text-ardoise">
            Mot de passe commun :{" "}
            <span className="font-mono text-signal">Passer123</span>
          </p>

          <div className="space-y-4">
            {COMPTES.map((bloc) => (
              <div key={bloc.groupe}>
                <p className="eyebrow mb-1.5 text-ardoise">{bloc.groupe}</p>
                <ul className="space-y-1">
                  {bloc.lignes.map((ligne) => (
                    <li key={ligne.email}>
                      <button
                        type="button"
                        onClick={() => copier(ligne.email)}
                        className="flex w-full items-baseline justify-between gap-3 rounded-net px-2 py-1 text-left transition-colors hover:bg-nuit-800"
                      >
                        <span className="truncate font-mono text-xs text-ivoire">
                          {ligne.email}
                        </span>
                        <span className="shrink-0 text-[0.6875rem] text-ardoise">
                          {copie === ligne.email ? "copié" : ligne.detail}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
