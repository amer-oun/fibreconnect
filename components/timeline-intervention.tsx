import { STATUT_LABELS, type Statut, couleurStatut } from "@/lib/constants";
import { formaterDateHeure, formaterDelai } from "@/lib/dates";

/**
 * Signature element of the project.
 *
 * The vertical rule linking the steps is the fibre itself. Completed segments
 * are solid cyan; the segment reaching towards the next expected step carries
 * a travelling highlight — the signal progressing down the cable. This is the
 * only animation in the whole application, and it disappears entirely under
 * `prefers-reduced-motion`.
 */

const LIBELLES_ACTION: Record<string, string> = {
  CREATION: "Panne déclarée",
  ACCEPTATION: "Intervention acceptée",
  ASSIGNATION_SUPERVISEUR: "Technicien assigné par le superviseur",
  REASSIGNATION: "Intervention réassignée",
  DEMARRAGE: "Intervention démarrée",
  CLOTURE: "Intervention terminée",
  ANNULATION: "Intervention annulée",
};

/** Ce qui est attendu ensuite, selon le statut courant. */
const PROCHAINE_ETAPE: Partial<Record<Statut, string>> = {
  NOUVELLE: "En attente d’un technicien",
  ASSIGNEE: "En attente du démarrage",
  EN_COURS: "En attente du rapport de clôture",
};

export type LigneHistorique = {
  id: string;
  action: string;
  ancienStatut: string | null;
  nouveauStatut: string;
  dateAction: Date;
  commentaire: string | null;
  technicien: {
    matricule: string;
    utilisateur: { nom: string; prenom: string };
  } | null;
};

export default function TimelineIntervention({
  historiques,
  statut,
}: {
  historiques: LigneHistorique[];
  statut: string;
}) {
  const attente = PROCHAINE_ETAPE[statut as Statut];

  return (
    <ol className="relative">
      {historiques.map((ligne, index) => {
        const dernier = index === historiques.length - 1;
        const couleur = couleurStatut(ligne.nouveauStatut);

        return (
          <li key={ligne.id} className="relative flex gap-4 pb-7 last:pb-0">
            {/* Trait de liaison : plein cyan entre deux etapes franchies. */}
            {!dernier && (
              <span
                aria-hidden
                className="absolute top-3 bottom-0 left-[5px] w-0.5 bg-signal"
              />
            )}
            {/* Vers l'etape suivante encore a venir : le signal progresse. */}
            {dernier && attente && (
              <span
                aria-hidden
                className="trait-signal absolute top-3 bottom-0 left-[5px] w-0.5"
              />
            )}

            <span
              aria-hidden
              className="relative z-10 mt-[5px] size-3 shrink-0 rounded-full border-2 border-white"
              style={{ backgroundColor: couleur.hex }}
            />

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-medium text-nuit">
                  {LIBELLES_ACTION[ligne.action] ??
                    STATUT_LABELS[ligne.nouveauStatut as Statut] ??
                    ligne.action}
                </p>
                <time
                  dateTime={new Date(ligne.dateAction).toISOString()}
                  className="font-mono text-xs text-ardoise"
                  title={formaterDelai(ligne.dateAction)}
                >
                  {formaterDateHeure(ligne.dateAction)}
                </time>
              </div>

              {ligne.commentaire && (
                <p className="mt-1 text-sm text-ardoise">{ligne.commentaire}</p>
              )}

              {ligne.technicien && (
                <p className="mt-1 text-sm text-ardoise">
                  {ligne.technicien.utilisateur.prenom}{" "}
                  {ligne.technicien.utilisateur.nom}
                  <span className="ml-2 font-mono text-xs">
                    {ligne.technicien.matricule}
                  </span>
                </p>
              )}
            </div>
          </li>
        );
      })}

      {attente && (
        <li className="relative flex gap-4">
          <span
            aria-hidden
            className="relative z-10 mt-[5px] size-3 shrink-0 rounded-full border-2 border-trait bg-white"
          />
          <p className="pt-px text-sm text-ardoise italic">{attente}</p>
        </li>
      )}
    </ol>
  );
}
