import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { selectionListe } from "@/lib/interventions";
import { restesAPayer } from "@/lib/facturation";
import { formaterMontant, formaterMontantCourt } from "@/lib/monnaie";
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

  const [interventions, compteurs, impayees] = await Promise.all([
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
    prisma.facture.findMany({
      where: { statut: "A_PAYER", intervention: { clientId: client.id } },
      orderBy: { dateEmission: "asc" },
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        intervention: { select: { id: true } },
      },
    }),
  ]);

  // Le solde vient de la base, pas d'une addition dans le navigateur.
  const soldes = await restesAPayer(prisma, impayees);
  const resteDu = [...soldes.values()].reduce((s, m) => s + m, 0);

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

      {/* Ce qui appelle un geste passe avant l'etat des lieux : un abonne qui
          doit de l'argent doit l'apprendre ici, pas en ouvrant chaque fiche. */}
      {impayees.length > 0 && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-bloc border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p>
            <span className="font-medium">
              {impayees.length === 1
                ? "Une facture à régler"
                : `${impayees.length} factures à régler`}
            </span>{" "}
            — <span className="tabulaire">{formaterMontant(resteDu)}</span> au total.
          </p>
          <span className="flex flex-wrap gap-2">
            {impayees.map((f) => (
              <Link
                key={f.id}
                href={`/client/suivi/${f.intervention.id}`}
                className="font-mono text-xs underline decoration-2 underline-offset-4"
              >
                {f.numero}
              </Link>
            ))}
          </span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Indicateur libelle="En cours" valeur={enCours} accent={ACCENTS.attention} />
        <Indicateur
          libelle="Terminées"
          valeur={parStatut.TERMINEE ?? 0}
          accent={ACCENTS.succes}
        />
        <Indicateur
          libelle="À régler"
          valeur={formaterMontantCourt(resteDu)}
          accent={resteDu > 0 ? ACCENTS.attention : ACCENTS.neutre}
          precision={
            impayees.length > 0
              ? `${impayees.length} facture${impayees.length > 1 ? "s" : ""}`
              : "rien à payer"
          }
        />
        <Indicateur libelle="Total des demandes" valeur={total} />
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
                : "Dès qu’un problème survient sur votre ligne, déclarez-le ici : un technicien FibreConnect de votre secteur le verra immédiatement."
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
