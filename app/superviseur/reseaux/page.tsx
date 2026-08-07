import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import PastilleOperateur from "@/components/ui/pastille-operateur";
import FormulaireLogo from "@/components/operateurs/formulaire-logo";

export const metadata: Metadata = { title: "Réseaux partenaires" };

/**
 * The three networks FibreConnect subcontracts for.
 *
 * Read-only apart from the logo: an operator's name is a business key.
 *
 * No technician count here any more — technicians belong to FibreConnect, not
 * to a network. What decides who handles a fault is the subscriber's zone, so
 * staffing is measured on the Techniciens page instead.
 */
export default async function ReseauxPartenaires() {
  await exigerRole("SUPERVISEUR");

  const operateurs = await prisma.operateur.findMany({
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      logoUrl: true,
      _count: { select: { clients: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Réseaux partenaires"
        description="Les opérateurs dont FibreConnect dépanne les abonnés. L’opérateur est une information de contrat : il n’influe pas sur le technicien qui intervient."
      />

      <div className="flex flex-col gap-6">
        {operateurs.map((operateur) => {
          return (
            <Panneau key={operateur.id}>
              <TitrePanneau>
                <span className="flex items-center gap-2.5">
                  <PastilleOperateur
                    nom={operateur.nom}
                    logoUrl={operateur.logoUrl}
                    taille="petit"
                  />
                  {operateur.nom}
                </span>
              </TitrePanneau>

              <div className="grid gap-6 p-5 md:grid-cols-2">
                <div>
                  <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                    <div>
                      <dt className="eyebrow">Abonnés</dt>
                      <dd className="mt-0.5 font-mono text-lg text-nuit">
                        {operateur._count.clients}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-4 text-xs text-ardoise">
                    Nos techniciens interviennent sur ce réseau comme sur
                    l’autre : c’est la zone de l’abonné qui décide qui traite sa
                    panne, pas son opérateur.{" "}
                    <Link
                      href="/superviseur/techniciens"
                      className="underline decoration-2 underline-offset-2"
                    >
                      Voir la couverture par zone
                    </Link>
                    .
                  </p>
                </div>

                <FormulaireLogo
                  operateurId={operateur.id}
                  nom={operateur.nom}
                  logoUrl={operateur.logoUrl}
                />
              </div>
            </Panneau>
          );
        })}
      </div>
    </div>
  );
}
