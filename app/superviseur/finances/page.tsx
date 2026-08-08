import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { ACCENTS, libelleTypePanne } from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
import { formaterDateHeure } from "@/lib/dates";
import { bilanFinancier, paieDuMois, restesAPayer } from "@/lib/facturation";
import {
  EntetePage,
  EtatVide,
  Indicateur,
  Panneau,
  TitrePanneau,
} from "@/components/ui/surfaces";
import { BadgeFacture } from "@/components/ui/badges";
import BoutonImpression from "@/components/ui/bouton-impression";
import BoutonConfirmation from "@/components/facturation/bouton-confirmation";

export const metadata: Metadata = { title: "Finances" };

/**
 * The supervisor's money page — and the reason the supervisor is also the admin.
 *
 * Everything the company is owed, everything it holds, and everything it owes
 * its technicians, on one screen. Splitting it across three pages would let the
 * one figure that matters — billed but never collected — hide behind a tab
 * nobody opens.
 */
export default async function PageFinances() {
  await exigerRole("SUPERVISEUR");

  const maintenant = new Date();
  const debutDuMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finDuMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const [bilan, remises, virements, impayees, paie] = await Promise.all([
    bilanFinancier(),
    prisma.versement.findMany({
      where: { statut: "EN_ATTENTE" },
      orderBy: { dateCreation: "asc" },
      select: {
        id: true,
        montant: true,
        commentaire: true,
        dateCreation: true,
        technicien: {
          select: {
            matricule: true,
            zone: true,
            utilisateur: { select: { nom: true, prenom: true } },
          },
        },
      },
    }),
    prisma.paiement.findMany({
      where: { statut: "EN_ATTENTE", moyen: "VIREMENT" },
      orderBy: { dateCreation: "asc" },
      select: {
        id: true,
        reference: true,
        montant: true,
        dateCreation: true,
        facture: {
          select: {
            numero: true,
            intervention: {
              select: {
                client: {
                  select: {
                    utilisateur: { select: { nom: true, prenom: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.facture.findMany({
      where: { statut: "A_PAYER" },
      orderBy: { dateEmission: "asc" },
      take: 30,
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        statut: true,
        dateEmission: true,
        intervention: {
          select: {
            typePanne: true,
            client: {
              select: {
                ville: true,
                zone: true,
                utilisateur: { select: { nom: true, prenom: true } },
              },
            },
            technicien: { select: { matricule: true } },
          },
        },
      },
    }),
    paieDuMois(debutDuMois, finDuMois),
  ]);

  const soldes = await restesAPayer(prisma, impayees);
  const masseSalariale = paie.reduce((s, l) => s + l.total, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre="Comptabilité"
        titre="Finances"
        description="Ce que la société a facturé, ce qu’elle a reçu, ce que ses techniciens détiennent encore, et ce qu’elle leur doit ce mois-ci."
        actions={<BoutonImpression libelle="Imprimer l’état" />}
      />

      <div className="mb-8 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur
          libelle="Facturé"
          valeur={formaterMontant(bilan.facture)}
          precision={`${bilan.nombreFactures} facture${bilan.nombreFactures > 1 ? "s" : ""} émise${bilan.nombreFactures > 1 ? "s" : ""}`}
          accent={ACCENTS.neutre}
        />
        <Indicateur
          libelle="Encaissé"
          valeur={formaterMontant(bilan.encaisse)}
          precision="Règlements confirmés"
          accent={ACCENTS.succes}
        />
        <Indicateur
          libelle="Reste à recouvrer"
          valeur={formaterMontant(bilan.enAttente)}
          precision="Facturé mais pas encore payé"
          accent={bilan.enAttente > 0 ? ACCENTS.attention : ACCENTS.neutre}
        />
        <Indicateur
          libelle="Espèces chez les techniciens"
          valeur={formaterMontant(bilan.chezTechniciens)}
          precision="Reçues des abonnés, pas encore remises"
          accent={bilan.chezTechniciens > 0 ? ACCENTS.info : ACCENTS.neutre}
        />
      </div>

      <div className="flex flex-col gap-6">
        {/* Remises d'especes ------------------------------------------------ */}
        <Panneau accent={remises.length > 0}>
          <TitrePanneau
            actions={
              remises.length > 0 ? (
                <span className="tabulaire text-sm font-semibold text-nuit">
                  {formaterMontant(bilan.remisesAConfirmer.montant)}
                </span>
              ) : undefined
            }
          >
            Remises d’espèces à confirmer — {remises.length}
          </TitrePanneau>

          {remises.length === 0 ? (
            <EtatVide
              titre="Aucune remise en attente"
              message="Quand un technicien déclare rapporter les espèces qu’il a encaissées, la remise apparaît ici pour que vous accusiez réception."
            />
          ) : (
            <ul className="divide-y divide-trait">
              {remises.map((remise) => (
                <li
                  key={remise.id}
                  className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-nuit">
                      {remise.technicien.utilisateur.prenom}{" "}
                      {remise.technicien.utilisateur.nom}
                      <span className="ml-2 font-mono text-xs text-ardoise">
                        {remise.technicien.matricule ?? "—"} · {remise.technicien.zone}
                      </span>
                    </p>
                    <p className="mt-1 tabulaire font-display text-lg font-bold text-nuit">
                      {formaterMontant(remise.montant)}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-brume">
                      Déclarée le {formaterDateHeure(remise.dateCreation)}
                    </p>
                    {remise.commentaire && (
                      <p className="mt-1 text-sm text-ardoise">
                        {remise.commentaire}
                      </p>
                    )}
                  </div>

                  <BoutonConfirmation
                    url={`/api/versements/${remise.id}/confirmer`}
                    libelle="Accuser réception"
                  />
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        {/* Virements annonces ---------------------------------------------- */}
        <Panneau>
          <TitrePanneau>
            Virements annoncés — {virements.length}
          </TitrePanneau>

          {virements.length === 0 ? (
            <EtatVide
              titre="Aucun virement en attente"
              message="Un virement reste en attente jusqu’à ce que vous le voyiez sur le relevé bancaire et le confirmiez ici."
            />
          ) : (
            <ul className="divide-y divide-trait">
              {virements.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-nuit">
                      {v.facture.intervention.client.utilisateur.prenom}{" "}
                      {v.facture.intervention.client.utilisateur.nom}
                    </p>
                    <p className="mt-1 tabulaire font-semibold text-nuit">
                      {formaterMontant(v.montant)}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-brume">
                      {v.reference} · facture {v.facture.numero} · annoncé le{" "}
                      {formaterDateHeure(v.dateCreation)}
                    </p>
                  </div>

                  <BoutonConfirmation
                    url={`/api/paiements/${v.reference}/confirmer`}
                    libelle="Confirmer la réception"
                  />
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        {/* Factures impayees ------------------------------------------------ */}
        <Panneau>
          <TitrePanneau>Factures non soldées — {impayees.length}</TitrePanneau>

          {impayees.length === 0 ? (
            <EtatVide
              titre="Tout est réglé"
              message="Aucune facture n’attend de règlement."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-trait text-left">
                    <th scope="col" className="px-4 py-2.5 eyebrow sm:px-5">
                      Facture
                    </th>
                    <th scope="col" className="px-4 py-2.5 eyebrow">
                      Abonné
                    </th>
                    <th scope="col" className="px-4 py-2.5 eyebrow">
                      Intervention
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                      Reste dû
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-trait">
                  {impayees.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 sm:px-5">
                        <span className="font-mono text-xs text-nuit">
                          {f.numero}
                        </span>
                        <span className="ml-2">
                          <BadgeFacture statut={f.statut} />
                        </span>
                        <span className="mt-0.5 block font-mono text-xs text-brume">
                          {formaterDateHeure(f.dateEmission)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-nuit">
                        {f.intervention.client.utilisateur.prenom}{" "}
                        {f.intervention.client.utilisateur.nom}
                        <span className="mt-0.5 block text-xs text-ardoise">
                          {f.intervention.client.ville} ·{" "}
                          {f.intervention.client.zone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ardoise">
                        {libelleTypePanne(f.intervention.typePanne)}
                        <span className="mt-0.5 block font-mono text-xs text-brume">
                          {f.intervention.technicien?.matricule ?? "non assignée"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabulaire font-semibold text-nuit">
                        {formaterMontant(soldes.get(f.id) ?? f.montantTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panneau>

        {/* Paie ------------------------------------------------------------- */}
        <Panneau className="zone-impression">
          <TitrePanneau
            actions={
              <span className="tabulaire text-sm font-semibold text-nuit">
                {formaterMontant(masseSalariale)}
              </span>
            }
          >
            Paie du mois — fixe + commission
          </TitrePanneau>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">
                Rémunération des techniciens pour le mois en cours
              </caption>
              <thead>
                <tr className="border-b border-trait text-left">
                  <th scope="col" className="px-4 py-2.5 eyebrow sm:px-5">
                    Technicien
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                    Interventions
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                    Facturé
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                    Fixe
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                    Commission
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                    À verser
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right eyebrow">
                    Espèces détenues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trait">
                {paie.map((ligne) => (
                  <tr key={ligne.technicienId}>
                    <td className="px-4 py-3 sm:px-5">
                      <span className="font-medium text-nuit">{ligne.nom}</span>
                      <span className="mt-0.5 block font-mono text-xs text-ardoise">
                        {ligne.matricule ?? "—"} · {ligne.zone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabulaire text-ardoise">
                      {ligne.interventions}
                    </td>
                    <td className="px-4 py-3 text-right tabulaire text-ardoise">
                      {formaterMontant(ligne.chiffreAffaires)}
                    </td>
                    <td className="px-4 py-3 text-right tabulaire text-ardoise">
                      {formaterMontant(ligne.salaireBase)}
                    </td>
                    <td className="px-4 py-3 text-right tabulaire text-ardoise">
                      {formaterMontant(ligne.commission)}
                      <span className="ml-1 text-xs text-brume">
                        {Math.round(ligne.tauxCommission * 100)} %
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabulaire font-semibold text-nuit">
                      {formaterMontant(ligne.total)}
                    </td>
                    <td className="px-4 py-3 text-right tabulaire text-ardoise">
                      {ligne.especesEnMain > 0
                        ? formaterMontant(ligne.especesEnMain)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-trait px-4 py-3 text-xs text-ardoise sm:px-5">
            La commission porte sur les interventions <strong>terminées</strong>{" "}
            dans le mois, réglées ou non : le travail a été fait, le
            recouvrement est l’affaire de la société. La colonne « espèces
            détenues » est une dette du technicien envers l’entreprise, jamais
            déduite de sa paie.
          </p>
        </Panneau>
      </div>
    </div>
  );
}
