import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { ACCENTS, STATUT_VERSEMENT_LABELS, libelleTypePanne } from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
import { bornesDuMois, formaterDateHeure } from "@/lib/dates";
import {
  especesEnMain,
  paieDuMois,
  restesAPayer,
} from "@/lib/facturation";
import {
  EntetePage,
  EtatVide,
  Indicateur,
  Panneau,
  TitrePanneau,
} from "@/components/ui/surfaces";
import { BadgeFacture } from "@/components/ui/badges";
import BoutonEncaissement from "@/components/facturation/bouton-encaissement";
import FormulaireVersement from "@/components/facturation/formulaire-versement";

export const metadata: Metadata = { title: "Ma caisse" };

/**
 * The technician's money page.
 *
 * Two accounts, deliberately never merged into one figure: what the company
 * owes for the month (fixed salary + commission), and what the technician is
 * holding on the company's behalf. Netting them would produce a number nobody
 * could act on — you cannot hand back half a salary.
 */
export default async function PageCaisse() {
  const utilisateur = await exigerRole("TECHNICIEN");

  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      id: true,
      matricule: true,
      zone: true,
      salaireBase: true,
      tauxCommission: true,
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

  /*
   * La rémunération vient de `paieDuMois`, la même fonction que la page
   * Finances du superviseur — jamais d'un calcul refait ici.
   *
   * Ce fut d'abord un second calcul, et il a divergé le jour où la TVA est
   * arrivée : la commission portait encore sur le TTC côté technicien et déjà
   * sur le hors-taxes côté superviseur. Deux écrans qui annoncent deux salaires
   * différents pour le même mois sont pires que pas d'écran du tout.
   */
  const { debut: debutDuMois, fin: finDuMois } = bornesDuMois(null);

  const [aEncaisser, versements, paie, enMain] = await Promise.all([
    // Factures de ses interventions qui ne sont pas soldees.
    prisma.facture.findMany({
      where: {
        statut: "A_PAYER",
        intervention: { technicienId: technicien.id },
      },
      orderBy: { dateEmission: "desc" },
      select: {
        id: true,
        numero: true,
        montantTotal: true,
        statut: true,
        dateEmission: true,
        intervention: {
          select: {
            id: true,
            typePanne: true,
            client: {
              select: {
                ville: true,
                utilisateur: { select: { nom: true, prenom: true } },
              },
            },
          },
        },
      },
    }),
    prisma.versement.findMany({
      where: { technicienId: technicien.id },
      orderBy: { dateCreation: "desc" },
      take: 12,
      select: {
        id: true,
        montant: true,
        statut: true,
        commentaire: true,
        dateCreation: true,
        dateConfirmation: true,
      },
    }),
    paieDuMois(debutDuMois, finDuMois),
    especesEnMain(technicien.id),
  ]);

  const soldes = await restesAPayer(prisma, aEncaisser);

  // Sa propre ligne dans la paie du mois. Absente si son compte vient d'être
  // validé et qu'aucune paie ne le concerne encore.
  const ligne = paie.find((l) => l.technicienId === technicien.id);
  const chiffreAffaires = ligne?.chiffreAffaires ?? 0;
  const commission = ligne?.commission ?? 0;
  const remuneration = ligne?.total ?? technicien.salaireBase;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${technicien.matricule ?? "FibreConnect"} · zone ${technicien.zone}`}
        titre="Ma caisse"
        description="Les factures de vos interventions, les espèces que vous détenez pour la société, et votre rémunération du mois."
      />

      <div className="mb-8 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur
          libelle="Espèces en main"
          valeur={formaterMontant(enMain)}
          precision={
            enMain > 0 ? "À remettre à la société" : "Rien à remettre"
          }
          accent={enMain > 0 ? ACCENTS.attention : ACCENTS.neutre}
        />
        <Indicateur
          libelle="Facturé ce mois-ci"
          valeur={formaterMontant(chiffreAffaires)}
          precision={`hors taxes · ${ligne?.interventions ?? 0} intervention${(ligne?.interventions ?? 0) > 1 ? "s" : ""} terminée${(ligne?.interventions ?? 0) > 1 ? "s" : ""}`}
          accent={ACCENTS.info}
        />
        <Indicateur
          libelle="Commission"
          valeur={formaterMontant(commission)}
          precision={`${Math.round(technicien.tauxCommission * 100)} % du montant facturé hors taxes`}
          accent={ACCENTS.signal}
        />
        <Indicateur
          libelle="Rémunération du mois"
          valeur={formaterMontant(remuneration)}
          precision={
            ligne?.bulletin
              ? `Versée le ${formaterDateHeure(ligne.bulletin.dateVersement)}`
              : `Fixe ${formaterMontant(technicien.salaireBase)} + commission`
          }
          accent={ACCENTS.succes}
        />
      </div>

      <div className="flex flex-col gap-6">
        {enMain > 0 && (
          <Panneau accent>
            <TitrePanneau>Remettre les espèces</TitrePanneau>
            <div className="p-5">
              <FormulaireVersement montant={enMain} />
            </div>
          </Panneau>
        )}

        <Panneau>
          <TitrePanneau>
            Factures à régler — {aEncaisser.length}
          </TitrePanneau>

          {aEncaisser.length === 0 ? (
            <EtatVide
              titre="Aucune facture en attente"
              message="Toutes les interventions que vous avez clôturées ont été réglées."
            />
          ) : (
            <ul className="divide-y divide-trait">
              {aEncaisser.map((facture) => {
                const reste = soldes.get(facture.id) ?? facture.montantTotal;
                return (
                  <li
                    key={facture.id}
                    className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-ardoise">
                          {facture.numero}
                        </span>
                        <BadgeFacture statut={facture.statut} />
                      </p>
                      <p className="mt-1 font-medium text-nuit">
                        {libelleTypePanne(facture.intervention.typePanne)} —{" "}
                        {facture.intervention.client.utilisateur.prenom}{" "}
                        {facture.intervention.client.utilisateur.nom}
                      </p>
                      <p className="mt-0.5 text-sm text-ardoise">
                        {facture.intervention.client.ville} · émise le{" "}
                        {formaterDateHeure(facture.dateEmission)}
                      </p>
                      <p className="mt-1.5 tabulaire text-sm font-semibold text-nuit">
                        {formaterMontant(reste)} à recouvrer
                        {reste !== facture.montantTotal && (
                          <span className="ml-2 font-normal text-ardoise">
                            sur {formaterMontant(facture.montantTotal)}
                          </span>
                        )}
                      </p>
                      <Link
                        href={`/technicien/historique?q=${facture.intervention.id.slice(-6)}`}
                        className="mt-1 inline-block text-xs text-ardoise underline decoration-signal decoration-2 underline-offset-4"
                      >
                        Voir l’intervention
                      </Link>
                    </div>

                    <BoutonEncaissement
                      factureId={facture.id}
                      resteAPayer={reste}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Panneau>

        <Panneau>
          <TitrePanneau>Mes remises</TitrePanneau>

          {versements.length === 0 ? (
            <EtatVide
              titre="Aucune remise déclarée"
              message="Dès que vous encaissez des espèces, vous pourrez les remettre à la société depuis cette page."
            />
          ) : (
            <ul className="divide-y divide-trait">
              {versements.map((v) => (
                <li key={v.id} className="px-4 py-3.5 sm:px-5">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabulaire font-semibold text-nuit">
                      {formaterMontant(v.montant)}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        v.statut === "CONFIRME" ? "text-valide" : "text-ardoise"
                      }`}
                    >
                      {STATUT_VERSEMENT_LABELS[
                        v.statut as keyof typeof STATUT_VERSEMENT_LABELS
                      ] ?? v.statut}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-brume">
                    Déclarée le {formaterDateHeure(v.dateCreation)}
                    {v.dateConfirmation &&
                      ` · reçue le ${formaterDateHeure(v.dateConfirmation)}`}
                  </p>
                  {v.commentaire && (
                    <p className="mt-1 text-sm text-ardoise">{v.commentaire}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panneau>
      </div>
    </div>
  );
}
