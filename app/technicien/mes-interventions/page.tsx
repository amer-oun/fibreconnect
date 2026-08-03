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
import { EntetePage, EtatVide, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import { LienBouton } from "@/components/ui/bouton";
import BarreFiltres from "@/components/interventions/barre-filtres";
import LigneIntervention from "@/components/interventions/ligne-intervention";
import ActionsTechnicien from "@/components/interventions/actions-technicien";

export const metadata: Metadata = { title: "Mes interventions" };

export default async function MesInterventions({
  searchParams,
}: {
  searchParams: Promise<ParametresRecherche>;
}) {
  const utilisateur = await exigerRole("TECHNICIEN");
  const parametres = await searchParams;

  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: { id: true, matricule: true, operateur: { select: { nom: true } } },
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

  const interventions = await prisma.intervention.findMany({
    where: {
      AND: [
        { technicienId: technicien.id, statut: { in: ["ASSIGNEE", "EN_COURS"] } },
        construireFiltreIntervention(parametres),
      ],
    },
    orderBy: [{ statut: "asc" }, { dateCreation: "asc" }],
    select: selectionListe,
  });

  const enCours = interventions.filter((i) => i.statut === "EN_COURS");
  const aDemarrer = interventions.filter((i) => i.statut === "ASSIGNEE");
  const filtre = Object.keys(parametres).length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${technicien.operateur.nom} · ${technicien.matricule}`}
        titre="Mes interventions"
        description="Les interventions que vous avez acceptées, en attente de démarrage ou en cours de traitement."
        actions={
          <LienBouton href="/technicien/dashboard" variante="secondaire">
            Voir les pannes disponibles
          </LienBouton>
        }
      />

      <div className="flex flex-col gap-6">
        <Panneau>
          <BarreFiltres
            placeholderRecherche="Rechercher dans mes interventions…"
            filtres={[
              { cle: "type", label: "Type", options: OPTIONS_TYPE_PANNE },
              { cle: "priorite", label: "Priorité", options: OPTIONS_PRIORITE },
            ]}
          />

          {interventions.length === 0 && (
            <EtatVide
              titre={filtre ? "Aucun résultat" : "Vous n’avez aucune intervention en cours"}
              message={
                filtre
                  ? "Aucune de vos interventions ne correspond à ces critères."
                  : "Rendez-vous sur les pannes disponibles pour en accepter une chez un abonné de votre opérateur."
              }
              action={
                !filtre && (
                  <LienBouton href="/technicien/dashboard">
                    Voir les pannes disponibles
                  </LienBouton>
                )
              }
            />
          )}
        </Panneau>

        {enCours.length > 0 && (
          <Panneau accent>
            <TitrePanneau>
              Sur le terrain — {enCours.length} en cours
            </TitrePanneau>
            <div className="divide-y divide-trait">
              {enCours.map((intervention) => (
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
          </Panneau>
        )}

        {aDemarrer.length > 0 && (
          <Panneau>
            <TitrePanneau>
              Acceptées, pas encore démarrées — {aDemarrer.length}
            </TitrePanneau>
            <div className="divide-y divide-trait">
              {aDemarrer.map((intervention) => (
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
          </Panneau>
        )}
      </div>
    </div>
  );
}
