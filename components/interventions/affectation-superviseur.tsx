"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Bouton } from "@/components/ui/bouton";
import { MessageErreur } from "@/components/ui/champs";

export type TechnicienAffectable = {
  id: string;
  nom: string;
  matricule: string | null;
  zone: string;
  disponible: boolean;
  chargeEnCours: number;
};

/**
 * Affectation manuelle par le superviseur.
 *
 * Les techniciens de la zone de l'abonné sont proposés en premier, les autres
 * sous une rubrique « hors zone » — jamais masqués. C'est justement le geste
 * qui débloque une zone sans personne, et l'interdire à l'écran obligerait à
 * créer un compte fictif pour dépanner une ville.
 *
 * L'API applique la même règle : elle accepte l'écart, mais l'inscrit dans
 * l'historique de l'intervention.
 */
export default function AffectationSuperviseur({
  interventionId,
  zone,
  technicienActuelId,
  techniciens,
  statut,
}: {
  interventionId: string;
  zone: string;
  technicienActuelId: string | null;
  techniciens: TechnicienAffectable[];
  statut: string;
}) {
  const router = useRouter();
  const [choix, setChoix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const terminal = statut === "TERMINEE" || statut === "ANNULEE";

  if (terminal) {
    return (
      <p className="text-xs text-brume italic">
        Intervention clôturée — plus d’affectation possible.
      </p>
    );
  }

  const eligibles = techniciens.filter((t) => t.id !== technicienActuelId);
  const dansLaZone = eligibles.filter((t) => t.zone === zone);
  const horsZone = eligibles.filter((t) => t.zone !== zone);

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
        Aucun autre technicien actif dans l’équipe.
      </p>
    );
  }

  const libelle = (t: TechnicienAffectable) =>
    `${t.nom} · ${t.chargeEnCours} en cours${t.disponible ? "" : " (indisponible)"}`;

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

          {dansLaZone.length > 0 && (
            <optgroup label={`Zone ${zone}`}>
              {dansLaZone.map((t) => (
                <option key={t.id} value={t.id}>
                  {libelle(t)}
                </option>
              ))}
            </optgroup>
          )}

          {horsZone.length > 0 && (
            <optgroup label="Hors zone — déplacement à prévoir">
              {horsZone.map((t) => (
                <option key={t.id} value={t.id}>
                  {libelle(t)} · {t.zone}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <Bouton taille="petit" disabled={!choix || enCours} onClick={affecter}>
          {enCours ? "…" : technicienActuelId ? "Réaffecter" : "Affecter"}
        </Bouton>
      </div>

      {dansLaZone.length === 0 && (
        <p className="max-w-64 text-xs text-amber-700 md:text-right">
          Aucun technicien ne couvre la zone {zone}.
        </p>
      )}

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
    </div>
  );
}
