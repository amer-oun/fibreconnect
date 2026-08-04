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
 * Read-only apart from the logo: an operator's name is a business key. The
 * counts are here because they answer the only question a supervisor really
 * asks of this page — is our coverage of each network staffed at all?
 */
export default async function ReseauxPartenaires() {
  await exigerRole("SUPERVISEUR");

  const operateurs = await prisma.operateur.findMany({
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      logoUrl: true,
      _count: { select: { techniciens: true, clients: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre="Supervision"
        titre="Réseaux partenaires"
        description="Les opérateurs pour lesquels FibreConnect intervient. Un technicien ne voit que les pannes des abonnés du réseau sur lequel il est habilité."
      />

      <div className="flex flex-col gap-6">
        {operateurs.map((operateur) => {
          const sansTechnicien = operateur._count.techniciens === 0;

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
                      <dt className="eyebrow">Techniciens habilités</dt>
                      <dd className="mt-0.5 font-mono text-lg text-nuit">
                        {operateur._count.techniciens}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Abonnés</dt>
                      <dd className="mt-0.5 font-mono text-lg text-nuit">
                        {operateur._count.clients}
                      </dd>
                    </div>
                  </dl>

                  {sansTechnicien && operateur._count.clients > 0 && (
                    <p className="mt-4 rounded-net border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Aucun technicien n’est habilité sur ce réseau : les pannes
                      de ses {operateur._count.clients} abonnés ne sont visibles
                      par personne.{" "}
                      <Link
                        href="/superviseur/techniciens/nouveau"
                        className="underline decoration-2 underline-offset-2"
                      >
                        Créer un compte technicien
                      </Link>
                      .
                    </p>
                  )}
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
