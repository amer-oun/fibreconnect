import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import { formaterDateHeure, formaterDuree, heuresEntre } from "@/lib/dates";
import {
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
import { calculerPagination, lirePage } from "@/lib/pagination";
import { ACCENTS } from "@/lib/constants";
import { NoteEtoiles } from "@/components/ui/note-etoiles";
import BoutonImpression from "@/components/ui/bouton-impression";
import Pagination from "@/components/ui/pagination";
import BarreFiltres from "@/components/interventions/barre-filtres";
import LigneIntervention from "@/components/interventions/ligne-intervention";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoriqueTechnicien({
  searchParams,
}: {
  searchParams: Promise<ParametresRecherche>;
}) {
  const utilisateur = await exigerRole("TECHNICIEN");
  const parametres = await searchParams;

  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: { id: true, matricule: true, zone: true },
  });

  if (!technicien) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <EntetePage
          titre="Profil incomplet"
          description="Votre compte n’est rattaché à aucune fiche technicien."
        />
      </div>
    );
  }

  const filtreSql = {
    AND: [
      { technicienId: technicien.id, statut: { in: ["TERMINEE", "ANNULEE"] } },
      construireFiltreIntervention(parametres),
    ],
  };

  // Le total conditionne les bornes de la requete : il se compte d'abord.
  const pagination = calculerPagination(
    await prisma.intervention.count({ where: filtreSql }),
    lirePage(parametres),
  );

  const [interventions, toutes] = await Promise.all([
    prisma.intervention.findMany({
      where: filtreSql,
      orderBy: { dateFin: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      select: selectionListe,
    }),
    prisma.intervention.findMany({
      where: { technicienId: technicien.id, statut: "TERMINEE" },
      select: { dateDebut: true, dateFin: true, noteClient: true },
    }),
  ]);

  const durees = toutes
    .filter((i) => i.dateDebut && i.dateFin)
    .map((i) => heuresEntre(i.dateDebut!, i.dateFin!));
  const dureeMoyenne =
    durees.length > 0
      ? durees.reduce((a, b) => a + b, 0) / durees.length
      : null;

  const notes = toutes.filter((i) => i.noteClient !== null).map((i) => i.noteClient!);
  const noteMoyenne =
    notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;

  const filtre = Object.keys(parametres).some((cle) => cle !== "page");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${technicien.matricule ?? "FibreConnect"} · zone ${technicien.zone}`}
        titre="Historique"
        description="Toutes vos interventions terminées ou annulées, avec le rapport que vous avez rédigé et la note laissée par l’abonné."
        actions={<BoutonImpression libelle="Imprimer l’historique" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur
          libelle="Terminées"
          valeur={toutes.length}
          accent={ACCENTS.succes}
        />
        <Indicateur
          libelle="Durée moyenne"
          valeur={dureeMoyenne !== null ? `${dureeMoyenne.toFixed(1)} h` : "—"}
          precision="du démarrage à la clôture"
        />
        <Indicateur
          libelle="Note moyenne"
          valeur={noteMoyenne !== null ? noteMoyenne.toFixed(1) : "—"}
          accent={ACCENTS.attention}
          precision={`${notes.length} avis`}
        />
        <Indicateur
          libelle={filtre ? "Résultats" : "Dans l’historique"}
          valeur={pagination.total}
          precision={
            pagination.pages > 1
              ? `page ${pagination.page} sur ${pagination.pages}`
              : undefined
          }
        />
      </div>

      <Panneau>
        <BarreFiltres
          placeholderRecherche="Rechercher dans mes rapports…"
          filtres={[
            {
              cle: "statut",
              label: "Statut",
              options: OPTIONS_STATUT.filter((o) =>
                ["TERMINEE", "ANNULEE"].includes(o.valeur),
              ),
            },
            { cle: "type", label: "Type", options: OPTIONS_TYPE_PANNE },
          ]}
        />

        {interventions.length === 0 ? (
          <EtatVide
            titre={filtre ? "Aucun résultat" : "Votre historique est vide"}
            message={
              filtre
                ? "Aucune intervention passée ne correspond à ces critères."
                : "Les interventions que vous aurez terminées ou annulées apparaîtront ici, avec leur rapport."
            }
          />
        ) : (
          <div className="divide-y divide-trait">
            {interventions.map((intervention) => (
              <div key={intervention.id}>
                <LigneIntervention
                  intervention={intervention}
                  afficherClient
                />
                {(intervention.rapport || intervention.noteClient !== null) && (
                  <div className="border-t border-dashed border-trait bg-ivoire/60 px-4 py-3 sm:px-5">
                    {intervention.rapport && (
                      <>
                        <p className="eyebrow mb-1">Rapport</p>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-ardoise">
                          {intervention.rapport}
                        </p>
                      </>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs text-brume">
                      {intervention.dateFin && (
                        <span>
                          Clôturée le {formaterDateHeure(intervention.dateFin)}
                        </span>
                      )}
                      {intervention.dateDebut && intervention.dateFin && (
                        <span>
                          Durée{" "}
                          {formaterDuree(
                            intervention.dateDebut,
                            intervention.dateFin,
                          )}
                        </span>
                      )}
                      {intervention.noteClient !== null && (
                        <span className="flex items-center gap-1.5">
                          Note de l’abonné
                          <NoteEtoiles
                            note={intervention.noteClient}
                            taille="petit"
                          />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panneau>

      <Pagination
        chemin="/technicien/historique"
        parametres={parametres}
        etat={pagination}
        nom="interventions"
      />
    </div>
  );
}
