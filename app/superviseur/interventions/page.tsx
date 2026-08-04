import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import {
  OPTIONS_PRIORITE,
  OPTIONS_STATUT,
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
import BoutonImpression from "@/components/ui/bouton-impression";
import BarreFiltres from "@/components/interventions/barre-filtres";
import LigneIntervention from "@/components/interventions/ligne-intervention";
import AffectationSuperviseur, {
  type TechnicienAffectable,
} from "@/components/interventions/affectation-superviseur";
import BoutonAnnulation from "@/components/interventions/bouton-annulation";

export const metadata: Metadata = { title: "Interventions" };

export default async function InterventionsSuperviseur({
  searchParams,
}: {
  searchParams: Promise<ParametresRecherche>;
}) {
  await exigerRole("SUPERVISEUR");
  const parametres = await searchParams;

  const [interventions, techniciensBruts, operateurs, sansTechnicien] =
    await Promise.all([
      prisma.intervention.findMany({
        where: construireFiltreIntervention(parametres),
        orderBy: { dateCreation: "desc" },
        take: 100,
        select: {
          ...selectionListe,
          technicienId: true,
          client: {
            select: {
              ...selectionListe.client.select,
              operateurId: true,
            },
          },
        },
      }),
      prisma.technicien.findMany({
        where: { utilisateur: { actif: true } },
        select: {
          id: true,
          matricule: true,
          zone: true,
          operateurId: true,
          disponible: true,
          utilisateur: { select: { nom: true, prenom: true } },
          _count: {
            select: {
              interventions: { where: { statut: { in: ["ASSIGNEE", "EN_COURS"] } } },
            },
          },
        },
      }),
      prisma.operateur.findMany({
        orderBy: { nom: "asc" },
        select: { id: true, nom: true },
      }),
      prisma.intervention.count({ where: { statut: "NOUVELLE" } }),
    ]);

  const techniciens: TechnicienAffectable[] = techniciensBruts.map((t) => ({
    id: t.id,
    nom: `${t.utilisateur.prenom} ${t.utilisateur.nom}`,
    matricule: t.matricule,
    zone: t.zone,
    operateurId: t.operateurId,
    disponible: t.disponible,
    chargeEnCours: t._count.interventions,
  }));

  const filtre = Object.keys(parametres).length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre="Supervision"
        titre="Interventions"
        description="Toutes les interventions des trois opérateurs. Vous pouvez affecter ou réaffecter n’importe laquelle à n’importe quel technicien du même opérateur."
        actions={<BoutonImpression libelle="Imprimer la liste" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur
          libelle="Sans technicien"
          valeur={sansTechnicien}
          accent="#64748B"
          precision="à affecter"
        />
        <Indicateur libelle="Affichées" valeur={interventions.length} />
        <Indicateur
          libelle="Techniciens actifs"
          valeur={techniciens.length}
          accent="#16A34A"
        />
        <Indicateur libelle="Opérateurs" valeur={operateurs.length} />
      </div>

      <Panneau>
        <BarreFiltres
          placeholderRecherche="Rechercher par abonné, ville, contrat, matricule…"
          filtres={[
            { cle: "statut", label: "Statut", options: OPTIONS_STATUT },
            {
              cle: "operateur",
              label: "Opérateur",
              options: operateurs.map((o) => ({ valeur: o.id, libelle: o.nom })),
            },
            { cle: "type", label: "Type", options: OPTIONS_TYPE_PANNE },
            { cle: "priorite", label: "Priorité", options: OPTIONS_PRIORITE },
          ]}
        />

        {interventions.length === 0 ? (
          <EtatVide
            titre={filtre ? "Aucun résultat" : "Aucune intervention enregistrée"}
            message={
              filtre
                ? "Aucune intervention ne correspond à ces critères. Effacez les filtres pour voir toute la file."
                : "Les pannes déclarées par les abonnés apparaîtront ici dès la première déclaration."
            }
          />
        ) : (
          <div className="divide-y divide-trait">
            {interventions.map((intervention) => (
              <LigneIntervention
                key={intervention.id}
                intervention={intervention}
                afficherClient
                afficherTechnicien
                actions={
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <AffectationSuperviseur
                      interventionId={intervention.id}
                      operateurId={intervention.client.operateurId}
                      technicienActuelId={intervention.technicienId}
                      techniciens={techniciens}
                      statut={intervention.statut}
                    />
                    <BoutonAnnulation
                      interventionId={intervention.id}
                      statut={intervention.statut}
                      role="SUPERVISEUR"
                    />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Panneau>

      {interventions.length === 100 && (
        <p className="mt-4 text-center text-xs text-brume">
          Affichage limité aux 100 interventions les plus récentes. Affinez la
          recherche pour cibler les plus anciennes.
        </p>
      )}
    </div>
  );
}
