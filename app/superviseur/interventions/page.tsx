import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import {
  OPTIONS_PRIORITE,
  OPTIONS_STATUT,
  OPTIONS_TYPE_PANNE,
  OPTIONS_ZONE_FILTRE,
  construireFiltreIntervention,
  type ParametresRecherche,
} from "@/lib/filtres";
import {
  EntetePage,
  EtatVide,
  Indicateur,
  Panneau,
} from "@/components/ui/surfaces";
import { calculerPagination, lienExport, lirePage } from "@/lib/pagination";
import { classesBouton } from "@/components/ui/bouton";
import { ACCENTS } from "@/lib/constants";
import BoutonImpression from "@/components/ui/bouton-impression";
import Pagination from "@/components/ui/pagination";
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
  const filtreSql = construireFiltreIntervention(parametres);

  // Le total conditionne les bornes de la requete : il se compte d'abord.
  const pagination = calculerPagination(
    await prisma.intervention.count({ where: filtreSql }),
    lirePage(parametres),
  );

  const [interventions, techniciensBruts, operateurs, sansTechnicien] =
    await Promise.all([
      prisma.intervention.findMany({
        where: filtreSql,
        orderBy: { dateCreation: "desc" },
        skip: pagination.skip,
        take: pagination.take,
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
        where: { utilisateur: { statutCompte: "ACTIF" } },
        select: {
          id: true,
          matricule: true,
          zone: true,
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

  const filtre = Object.keys(parametres).some((cle) => cle !== "page");

  const techniciens: TechnicienAffectable[] = techniciensBruts.map((t) => ({
    id: t.id,
    nom: `${t.utilisateur.prenom} ${t.utilisateur.nom}`,
    matricule: t.matricule,
    zone: t.zone,
    disponible: t.disponible,
    chargeEnCours: t._count.interventions,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        titre="Interventions"
        description="Toutes les interventions, toutes zones confondues. Vous pouvez affecter ou réaffecter n’importe laquelle à n’importe quel technicien — y compris hors de sa zone, ce que l’historique consigne."
        actions={
          <>
            {/* L'export reprend les filtres affichés : ce qu'on voit est ce
                qu'on télécharge. `page` est retiré — on exporte tout le
                résultat, pas seulement la page ouverte. */}
            <a
              href={`/api/export/interventions${lienExport(parametres)}`}
              className={classesBouton("secondaire")}
              download
            >
              Exporter en CSV
              <span className="sr-only">
                {" "}
                — {pagination.total} interventions
              </span>
            </a>
            <BoutonImpression libelle="Imprimer la liste" />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur
          libelle="Sans technicien"
          valeur={sansTechnicien}
          accent={ACCENTS.neutre}
          precision="à affecter"
        />
        <Indicateur
          libelle={filtre ? "Résultats" : "Total"}
          valeur={pagination.total}
          precision={
            pagination.pages > 1
              ? `page ${pagination.page} sur ${pagination.pages}`
              : undefined
          }
        />
        <Indicateur
          libelle="Techniciens actifs"
          valeur={techniciens.length}
          accent={ACCENTS.succes}
        />
        <Indicateur libelle="Opérateurs" valeur={operateurs.length} />
      </div>

      <Panneau>
        <BarreFiltres
          placeholderRecherche="Rechercher par abonné, ville, contrat, matricule…"
          filtres={[
            { cle: "statut", label: "Statut", options: OPTIONS_STATUT },
            { cle: "zone", label: "Zone", options: OPTIONS_ZONE_FILTRE },
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
                      zone={intervention.client.zone}
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

      <Pagination
        chemin="/superviseur/interventions"
        parametres={parametres}
        etat={pagination}
        nom="interventions"
      />
    </div>
  );
}
