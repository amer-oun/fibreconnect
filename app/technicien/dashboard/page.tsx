import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import { ACCENTS } from "@/lib/constants";
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
 * A technician only ever sees NOUVELLE interventions whose subscriber sits in
 * the same zone. The filter is applied in the query, not in the view — hiding
 * rows client-side would still have sent them over the wire.
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

  const [disponibles, mesEnCours, totalZone] = await Promise.all([
    prisma.intervention.findMany({
      where: {
        AND: [
          // La regle centrale : meme zone que le technicien.
          { statut: "NOUVELLE", client: { zone: technicien.zone } },
          construireFiltreIntervention(parametres),
        ],
      },
      // Les plus anciennes d'abord ; la priorite est remise dans l'ordre
      // metier juste apres, en memoire (voir `rang`).
      orderBy: { dateCreation: "asc" },
      select: selectionListe,
    }),
    prisma.intervention.count({
      where: {
        technicienId: technicien.id,
        statut: { in: ["ASSIGNEE", "EN_COURS"] },
      },
    }),
    prisma.intervention.count({
      where: { statut: "NOUVELLE", client: { zone: technicien.zone } },
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
        surtitre={`FibreConnect · ${technicien.matricule ?? "matricule à venir"}`}
        titre="Pannes disponibles"
        description={`Vous couvrez la zone ${technicien.zone} : seules les pannes des abonnés de cette zone vous sont proposées, quel que soit leur opérateur.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur
          libelle="À prendre"
          valeur={totalZone}
          accent={ACCENTS.signal}
          precision={`zone ${technicien.zone}`}
        />
        <Indicateur
          libelle="Mes interventions"
          valeur={mesEnCours}
          accent={ACCENTS.attention}
          precision="en cours"
        />
        <Indicateur libelle="Ma zone" valeur={technicien.zone} />
        <Indicateur
          libelle="Statut"
          valeur={technicien.disponible ? "Disponible" : "Indisponible"}
          accent={technicien.disponible ? ACCENTS.succes : ACCENTS.danger}
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
                : `Aucun abonné de la zone ${technicien.zone} n’a de panne en attente. Cette page se met à jour à chaque nouvelle déclaration.`
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
