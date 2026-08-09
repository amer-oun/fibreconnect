import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { ACCENTS, STATUT_VERSEMENT_LABELS, libelleTypePanne } from "@/lib/constants";
import { formaterMontant } from "@/lib/monnaie";
import { formaterDateHeure } from "@/lib/dates";
import { especesEnMain, restesAPayer } from "@/lib/facturation";
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
 * The technician's cash page.
 *
 * Only company money passes through here: what subscribers still owe on his
 * interventions, what he has collected in cash and not yet handed back, and
 * what the company has acknowledged receiving.
 *
 * **Nothing about his salary.** What the company pays its employees is its own
 * accounting, and he knows his own payslip better than this application ever
 * will. Cash in his pocket is a different thing entirely — it is not his.
 */
export default async function PageCaisse() {
  const utilisateur = await exigerRole("TECHNICIEN");

  const technicien = await prisma.technicien.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      id: true,
      matricule: true,
      zone: true,
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

  const [aEncaisser, versements, enMain] = await Promise.all([
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
    especesEnMain(technicien.id),
  ]);

  const soldes = await restesAPayer(prisma, aEncaisser);
  const resteTotal = [...soldes.values()].reduce((s, m) => s + m, 0);
  const totalRemis = versements
    .filter((v) => v.statut === "CONFIRME")
    .reduce((s, v) => s + v.montant, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={`${technicien.matricule ?? "FibreConnect"} · zone ${technicien.zone}`}
        titre="Ma caisse"
        description="Les factures de vos interventions et les espèces que vous détenez pour le compte de la société."
      />

      {/* Ce que le technicien doit à la société, et ce qu'il lui reste à
          encaisser. Rien sur son salaire : ce n'est pas le sujet de cette
          application, et il le connaît mieux qu'elle. */}
      <div className="mb-8 grid gap-x-6 gap-y-5 sm:grid-cols-3">
        <Indicateur
          libelle="Espèces en main"
          valeur={formaterMontant(enMain)}
          precision={enMain > 0 ? "À remettre à la société" : "Rien à remettre"}
          accent={enMain > 0 ? ACCENTS.attention : ACCENTS.neutre}
        />
        <Indicateur
          libelle="À encaisser"
          valeur={formaterMontant(resteTotal)}
          precision={`${aEncaisser.length} facture${aEncaisser.length > 1 ? "s" : ""} non réglée${aEncaisser.length > 1 ? "s" : ""}`}
          accent={resteTotal > 0 ? ACCENTS.info : ACCENTS.neutre}
        />
        <Indicateur
          libelle="Remises confirmées"
          valeur={formaterMontant(totalRemis)}
          precision="Reçues par la société"
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
