import Link from "next/link";
import type { ReactNode } from "react";

import { libelleTypePanne } from "@/lib/constants";
import { formaterDateHeure, formaterDelai } from "@/lib/dates";
import type { InterventionListe } from "@/lib/interventions";
import { BadgePriorite, BadgeStatut, Reference } from "@/components/ui/badges";

/**
 * One intervention in a list.
 *
 * Laid out as a stack on a phone and as columns from `md` up, without a real
 * <table>: a technician reading this at 375px gets a readable block instead of
 * a horizontally scrolling grid.
 */
export default function LigneIntervention({
  intervention,
  lien,
  afficherClient = false,
  afficherTechnicien = false,
  actions,
}: {
  intervention: InterventionListe;
  lien?: string;
  afficherClient?: boolean;
  afficherTechnicien?: boolean;
  actions?: ReactNode;
}) {
  const contenu = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <BadgeStatut statut={intervention.statut} />
        <BadgePriorite priorite={intervention.priorite} />
        <Reference id={intervention.id} />
      </div>

      <div className="mt-2 min-w-0">
        <p className="font-display text-base font-semibold text-nuit">
          {libelleTypePanne(intervention.typePanne)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-ardoise">
          {intervention.description}
        </p>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-brume">Déclarée</dt>
          <dd
            className="font-mono text-ardoise"
            title={formaterDateHeure(intervention.dateCreation)}
          >
            {formaterDelai(intervention.dateCreation)}
          </dd>
        </div>

        <div className="flex gap-1.5">
          <dt className="text-brume">Lieu</dt>
          <dd className="text-ardoise">
            {intervention.client.ville}
            <span className="ml-1.5 font-mono text-brume">
              {intervention.client.operateur.nom}
            </span>
          </dd>
        </div>

        {afficherClient && (
          <div className="flex gap-1.5">
            <dt className="text-brume">Abonné</dt>
            <dd className="text-ardoise">
              {intervention.client.utilisateur.prenom}{" "}
              {intervention.client.utilisateur.nom}
              <span className="ml-1.5 font-mono text-brume">
                {intervention.client.numContrat}
              </span>
            </dd>
          </div>
        )}

        {afficherTechnicien && (
          <div className="flex gap-1.5">
            <dt className="text-brume">Technicien</dt>
            <dd className="text-ardoise">
              {intervention.technicien ? (
                <>
                  {intervention.technicien.utilisateur.prenom}{" "}
                  {intervention.technicien.utilisateur.nom}
                  <span className="ml-1.5 font-mono text-brume">
                    {intervention.technicien.matricule}
                  </span>
                </>
              ) : (
                <span className="italic">Non affectée</span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </>
  );

  return (
    <article className="border-l-2 border-l-transparent px-4 py-4 transition-colors hover:border-l-signal hover:bg-ivoire sm:px-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {lien ? (
            <Link href={lien} className="block focus-visible:outline-offset-4">
              {contenu}
            </Link>
          ) : (
            contenu
          )}
        </div>

        {actions && (
          <div className="sans-impression flex shrink-0 flex-wrap gap-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
