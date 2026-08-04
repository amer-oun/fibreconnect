import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import {
  OPTIONS_PRIORITE,
  OPTIONS_TYPE_PANNE,
  construireFiltreIntervention,
  type ParametresRecherche,
} from "@/lib/filtres";
import {
  EntetePage,
  EtatVide,
  Indicateur,
  Panneau,
} from "@/components/ui/surfaces";
import BarreFiltres from "@/components/interventions/barre-filtres";
import LigneIntervention from "@/components/interventions/ligne-intervention";
import ActionsTechnicien from "@/components/interventions/actions-technicien";

export const metadata: Metadata = { title: "Pannes disponibles" };

/**
 * The central rule of the project, on screen.
 *
 * A technician only ever sees NOUVELLE interventions whose client belongs to
 * the same operator. The filter is applied in the query, not in the view.
 */
export default async function PannesDisponibles({
  searchParams,
}: {
  searchParams: Promise<ParametresRecherche>;
}) {
  const utilisateur = await exigerRole("TECHNICIEN");
  const parametres = await searchParams;

  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      id: true,
      zone: true,
      matricule: true,
      disponible: true,
      operateurId: true,
      operateur: { select: { nom: true } },
    },
  });

  if (!technicien) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <EntetePage
          titre="Profil incomplet"
          description="Votre compte n’est rattaché à aucune fiche technicien. Contactez votre superviseur."
        />
      </div>
    );
  }

  const [disponibles, mesEnCours, totalOperateur] = await Promise.all([
    prisma.intervention.findMany({
      where: {
        AND: [
          { statut: "NOUVELLE", client: { operateurId: technicien.operateurId } },
          construireFiltreIntervention(parametres),
        ],
      },
      // Les urgences d'abord, puis les plus anciennes.
      orderBy: [{ priorite: "asc" }, { dateCreation: "asc" }],
      select: selectionListe,
    }),
    prisma.intervention.count({
      where: {
        technicienId: technicien.id,
        statut: { in: ["ASSIGNEE", "EN_COURS"] },
      },
    }),
    prisma.intervention.count({
      where: { statut: "NOUVELLE", client: { operateurId: technicien.operateurId } },
    }),
  ]);

  // `priorite` est une chaîne : on remet l'ordre métier côté serveur.
  const rang = { URGENTE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 } as Record<string, number>;
  const triees = [...disponibles].sort(
    (a, b) =>
      (rang[a.priorite] ?? 9) - (rang[b.priorite] ?? 9) ||
      a.dateCreation.getTime() - b.dateCreation.getTime(),
  );

  const filtre = Object.keys(parametres).length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${technicien.operateur.nom} · ${technicien.matricule}`}
        titre="Pannes disponibles"
        description={`Vous êtes habilité sur le réseau ${technicien.operateur.nom} : seules les pannes de ses abonnés vous sont proposées. Celles des autres réseaux ne vous sont jamais montrées.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur
          libelle="À prendre"
          valeur={totalOperateur}
          accent="#22D3EE"
          precision={`réseau ${technicien.operateur.nom}`}
        />
        <Indicateur
          libelle="Mes interventions"
          valeur={mesEnCours}
          accent="#F59E0B"
          precision="en cours"
        />
        <Indicateur libelle="Ma zone" valeur={technicien.zone} />
        <Indicateur
          libelle="Statut"
          valeur={technicien.disponible ? "Disponible" : "Indisponible"}
          accent={technicien.disponible ? "#16A34A" : "#DC2626"}
        />
      </div>

      <Panneau>
        <BarreFiltres
          placeholderRecherche="Rechercher par ville, adresse, contrat…"
          filtres={[
            { cle: "type", label: "Type", options: OPTIONS_TYPE_PANNE },
            { cle: "priorite", label: "Priorité", options: OPTIONS_PRIORITE },
          ]}
        />

        {triees.length === 0 ? (
          <EtatVide
            titre={
              filtre
                ? "Aucun résultat"
                : "Aucune intervention disponible pour le moment"
            }
            message={
              filtre
                ? "Aucune panne disponible ne correspond à ces critères. Effacez les filtres pour voir toute la file."
                : `Aucun abonné du réseau ${technicien.operateur.nom} n’a de panne en attente. Cette page se met à jour à chaque nouvelle déclaration.`
            }
          />
        ) : (
          <div className="divide-y divide-trait">
            {triees.map((intervention) => (
              <LigneIntervention
                key={intervention.id}
                intervention={intervention}
                afficherClient
                actions={
                  <ActionsTechnicien
                    interventionId={intervention.id}
                    statut={intervention.statut}
                  />
                }
              />
            ))}
          </div>
        )}
      </Panneau>
    </div>
  );
}
