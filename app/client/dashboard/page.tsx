import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import { ACCENTS } from "@/lib/constants";
import {
  OPTIONS_PRIORITE,
  OPTIONS_STATUT,
  OPTIONS_TYPE_PANNE,
  construireFiltreIntervention,
  type ParametresRecherche,
} from "@/lib/filtres";
import { EntetePage, EtatVide, Indicateur, Panneau } from "@/components/ui/surfaces";
import { LienBouton } from "@/components/ui/bouton";
import BarreFiltres from "@/components/interventions/barre-filtres";
import LigneIntervention from "@/components/interventions/ligne-intervention";

export const metadata: Metadata = { title: "Mes demandes" };

export default async function TableauDeBordClient({
  searchParams,
}: {
  searchParams: Promise<ParametresRecherche>;
}) {
  const utilisateur = await exigerRole("CLIENT");
  const parametres = await searchParams;

  const client = await prisma.client.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: { id: true, ville: true, operateur: { select: { nom: true } } },
  });

  if (!client) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <EntetePage
          titre="Profil incomplet"
          description="Votre compte n’est rattaché à aucun contrat d’abonné. Contactez votre opérateur pour le rattacher."
        />
      </div>
    );
  }

  const [interventions, compteurs] = await Promise.all([
    prisma.intervention.findMany({
      where: {
        AND: [{ clientId: client.id }, construireFiltreIntervention(parametres)],
      },
      orderBy: { dateCreation: "desc" },
      select: selectionListe,
    }),
    prisma.intervention.groupBy({
      by: ["statut"],
      where: { clientId: client.id },
      _count: true,
    }),
  ]);

  const parStatut = Object.fromEntries(
    compteurs.map((c) => [c.statut, c._count]),
  ) as Record<string, number>;

  const enCours =
    (parStatut.NOUVELLE ?? 0) +
    (parStatut.ASSIGNEE ?? 0) +
    (parStatut.EN_COURS ?? 0);
  const total = compteurs.reduce((somme, c) => somme + c._count, 0);
  const filtre = Object.keys(parametres).length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${client.operateur.nom} · ${client.ville}`}
        titre="Mes demandes"
        description="Toutes les pannes que vous avez déclarées, de la plus récente à la plus ancienne."
        actions={
          <LienBouton href="/client/nouvelle-panne">
            Déclarer une panne
          </LienBouton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur libelle="En cours" valeur={enCours} accent={ACCENTS.attention} />
        <Indicateur
          libelle="Terminées"
          valeur={parStatut.TERMINEE ?? 0}
          accent={ACCENTS.succes}
        />
        <Indicateur
          libelle="Annulées"
          valeur={parStatut.ANNULEE ?? 0}
          accent={ACCENTS.danger}
        />
        <Indicateur libelle="Total" valeur={total} />
      </div>

      <Panneau>
        <BarreFiltres
          placeholderRecherche="Rechercher dans mes demandes…"
          filtres={[
            { cle: "statut", label: "Statut", options: OPTIONS_STATUT },
            { cle: "type", label: "Type", options: OPTIONS_TYPE_PANNE },
            { cle: "priorite", label: "Priorité", options: OPTIONS_PRIORITE },
          ]}
        />

        {interventions.length === 0 ? (
          <EtatVide
            titre={filtre ? "Aucun résultat" : "Aucune demande pour le moment"}
            message={
              filtre
                ? "Aucune de vos demandes ne correspond à ces critères. Élargissez la recherche ou effacez les filtres."
                : "Dès qu’un problème survient sur votre ligne, déclarez-le ici : un technicien de votre opérateur le verra immédiatement."
            }
            action={
              !filtre && (
                <LienBouton href="/client/nouvelle-panne">
                  Déclarer une panne
                </LienBouton>
              )
            }
          />
        ) : (
          <div className="divide-y divide-trait">
            {interventions.map((intervention) => (
              <LigneIntervention
                key={intervention.id}
                intervention={intervention}
                lien={`/client/suivi/${intervention.id}`}
                afficherTechnicien
              />
            ))}
          </div>
        )}
      </Panneau>
    </div>
  );
}
