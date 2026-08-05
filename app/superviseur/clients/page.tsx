import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { ACCENTS } from "@/lib/constants";
import { EntetePage, EtatVide, Indicateur, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import BoutonImpression from "@/components/ui/bouton-impression";
import CarteClients from "@/components/carte/carte-clients";
import type { PointClient } from "@/components/carte/carte-interne";

export const metadata: Metadata = { title: "Clients" };

const COULEURS_OPERATEUR: Record<string, string> = {
  "Tunisie Telecom": "#0891B2",
  Ooredoo: "#B45309",
  Orange: "#7C3AED",
};

export default async function ClientsSuperviseur() {
  await exigerRole("SUPERVISEUR");

  const clients = await prisma.client.findMany({
    orderBy: [{ operateur: { nom: "asc" } }, { ville: "asc" }],
    select: {
      id: true,
      adresse: true,
      ville: true,
      numContrat: true,
      latitude: true,
      longitude: true,
      operateur: { select: { nom: true } },
      utilisateur: {
        select: { nom: true, prenom: true, telephone: true, email: true, actif: true },
      },
      interventions: { select: { statut: true } },
    },
  });

  const enrichis = clients.map((c) => ({
    ...c,
    ouvertes: c.interventions.filter((i) =>
      ["NOUVELLE", "ASSIGNEE", "EN_COURS"].includes(i.statut),
    ).length,
    total: c.interventions.length,
  }));

  const points: PointClient[] = enrichis
    .filter((c) => c.latitude !== null && c.longitude !== null)
    .map((c) => ({
      id: c.id,
      nom: `${c.utilisateur.prenom} ${c.utilisateur.nom}`,
      adresse: c.adresse,
      ville: c.ville,
      numContrat: c.numContrat,
      operateur: c.operateur.nom,
      latitude: c.latitude!,
      longitude: c.longitude!,
      interventionsOuvertes: c.ouvertes,
    }));

  const villes = new Set(enrichis.map((c) => c.ville));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Clients"
        description="Les abonnés des trois opérateurs et leur position sur le réseau. Un contour ambré signale une intervention en cours."
        actions={<BoutonImpression libelle="Imprimer la liste" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur libelle="Abonnés" valeur={enrichis.length} />
        <Indicateur libelle="Villes couvertes" valeur={villes.size} />
        <Indicateur
          libelle="Interventions ouvertes"
          valeur={enrichis.reduce((s, c) => s + c.ouvertes, 0)}
          accent={ACCENTS.attention}
        />
        <Indicateur
          libelle="Localisés"
          valeur={`${points.length}/${enrichis.length}`}
          accent={ACCENTS.signal}
          precision="coordonnées connues"
        />
      </div>

      <div className="flex flex-col gap-6">
        <Panneau className="sans-impression">
          <TitrePanneau
            actions={
              <div className="flex flex-wrap items-center gap-3 text-xs text-ardoise">
                {Object.entries(COULEURS_OPERATEUR).map(([nom, couleur]) => (
                  <span key={nom} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: couleur }}
                    />
                    {nom}
                  </span>
                ))}
              </div>
            }
          >
            Carte des abonnés
          </TitrePanneau>
          <div className="h-[26rem] w-full overflow-hidden p-3 sm:h-[32rem]">
            <CarteClients points={points} />
          </div>
        </Panneau>

        <Panneau>
          <TitrePanneau>Liste des abonnés</TitrePanneau>

          {enrichis.length === 0 ? (
            <EtatVide
              titre="Aucun abonné enregistré"
              message="Les abonnés apparaissent ici dès qu’ils créent leur compte client."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-trait text-left">
                    {["Abonné", "Opérateur", "Contrat", "Ville", "Téléphone", "Interventions"].map(
                      (entete, index) => (
                        <th
                          key={entete}
                          scope="col"
                          className={`px-4 py-2.5 font-display text-xs font-semibold tracking-wide text-ardoise uppercase whitespace-nowrap ${
                            index === 5 ? "text-right" : ""
                          }`}
                        >
                          {entete}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-trait">
                  {enrichis.map((c) => (
                    <tr key={c.id} className="hover:bg-ivoire">
                      <th scope="row" className="px-4 py-3 text-left font-medium whitespace-nowrap text-nuit">
                        {c.utilisateur.prenom} {c.utilisateur.nom}
                        {!c.utilisateur.actif && (
                          <span className="ml-2 text-xs font-normal text-critique">
                            désactivé
                          </span>
                        )}
                        <span className="mt-0.5 block text-xs font-normal text-ardoise">
                          {c.adresse}
                        </span>
                      </th>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-ardoise">
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor:
                                COULEURS_OPERATEUR[c.operateur.nom] ?? "#64748B",
                            }}
                          />
                          {c.operateur.nom}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ardoise">
                        {c.numContrat}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ardoise">
                        {c.ville}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-ardoise">
                        {c.utilisateur.telephone}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-mono text-nuit">{c.total}</span>
                        {c.ouvertes > 0 && (
                          <span className="ml-2 rounded-net border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-xs text-amber-800">
                            {c.ouvertes} en cours
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panneau>
      </div>
    </div>
  );
}
