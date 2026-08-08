import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { exigerRole } from "@/lib/session";
import { libelleTypePanne } from "@/lib/constants";
import { formaterDateHeure } from "@/lib/dates";
import { resteAPayer, selectionFacture } from "@/lib/facturation";
import { EntetePage, Panneau, TitrePanneau } from "@/components/ui/surfaces";
import { LienBouton } from "@/components/ui/bouton";
import BoutonImpression from "@/components/ui/bouton-impression";
import { BadgeStatut, BadgeZone, Reference } from "@/components/ui/badges";
import PanneauFacture from "@/components/facturation/panneau-facture";
import RectificationFacture from "@/components/facturation/rectification-facture";

export const metadata: Metadata = { title: "Facture" };

/**
 * Fiche d'une facture, côté superviseur.
 *
 * C'est le seul endroit d'où l'on peut corriger ou annuler. Volontairement une
 * page à part et non un bouton dans un tableau : rectifier une facture demande
 * de la relire en entier, et une action de cette portée ne se déclenche pas au
 * milieu d'une liste de trente lignes.
 */
export default async function PageFactureSuperviseur({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigerRole("SUPERVISEUR");
  const { id } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id },
    select: {
      ...selectionFacture,
      intervention: {
        select: {
          id: true,
          typePanne: true,
          statut: true,
          dateFin: true,
          rapport: true,
          client: {
            select: {
              ville: true,
              zone: true,
              adresse: true,
              numContrat: true,
              utilisateur: {
                select: { nom: true, prenom: true, telephone: true },
              },
            },
          },
          technicien: {
            select: {
              matricule: true,
              utilisateur: { select: { nom: true, prenom: true } },
            },
          },
        },
      },
    },
  });

  if (!facture) notFound();

  const reste = await resteAPayer(prisma, facture.id);
  const { intervention } = facture;

  // Le geste n'est offert que quand il est possible : une facture soldée ou
  // partiellement réglée ne se rectifie pas (voir lib/facturation.ts).
  const rectifiable =
    facture.statut === "A_PAYER" &&
    !facture.paiements.some((p) => p.statut === "CONFIRME");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <EntetePage
        surtitre={
          <>
            Intervention <Reference id={intervention.id} /> ·{" "}
            <BadgeStatut statut={intervention.statut} />
          </>
        }
        titre={`Facture ${facture.numero}`}
        description={`${libelleTypePanne(intervention.typePanne)} chez ${
          intervention.client.utilisateur.prenom
        } ${intervention.client.utilisateur.nom}`}
        actions={
          <>
            <BoutonImpression libelle="Imprimer la facture" />
            <LienBouton href="/superviseur/finances" variante="secondaire">
              Finances
            </LienBouton>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <PanneauFacture facture={facture} resteAPayer={reste} />

        <Panneau>
          <TitrePanneau
            actions={<BadgeZone zone={intervention.client.zone} />}
          >
            Abonné et intervention
          </TitrePanneau>
          <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Abonné</dt>
              <dd className="mt-0.5 text-nuit">
                {intervention.client.utilisateur.prenom}{" "}
                {intervention.client.utilisateur.nom}
                <br />
                <span className="font-mono text-xs text-ardoise">
                  {intervention.client.utilisateur.telephone} ·{" "}
                  {intervention.client.numContrat}
                </span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Lieu</dt>
              <dd className="mt-0.5 text-nuit">
                {intervention.client.adresse}
                <br />
                {intervention.client.ville}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Technicien</dt>
              <dd className="mt-0.5 text-nuit">
                {intervention.technicien
                  ? `${intervention.technicien.utilisateur.prenom} ${intervention.technicien.utilisateur.nom}`
                  : "—"}
                {intervention.technicien?.matricule && (
                  <span className="ml-2 font-mono text-xs text-ardoise">
                    {intervention.technicien.matricule}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Clôturée le</dt>
              <dd className="mt-0.5 text-nuit">
                {intervention.dateFin
                  ? formaterDateHeure(intervention.dateFin)
                  : "—"}
              </dd>
            </div>
            {intervention.rapport && (
              <div className="sm:col-span-2">
                <dt className="eyebrow">Rapport du technicien</dt>
                <dd className="mt-1 leading-relaxed whitespace-pre-line text-ardoise">
                  {intervention.rapport}
                </dd>
              </div>
            )}
          </dl>
        </Panneau>

        <Panneau className="sans-impression">
          <TitrePanneau>Rectifier</TitrePanneau>
          <div className="p-5">
            {rectifiable ? (
              <RectificationFacture
                factureId={facture.id}
                lignes={facture.lignes}
              />
            ) : (
              <p className="text-sm text-ardoise">
                {facture.statut === "ANNULEE"
                  ? "Cette facture est annulée : elle ne peut plus être modifiée."
                  : facture.statut === "PAYEE"
                    ? "Cette facture est soldée. Corriger un montant déjà encaissé demanderait un avoir, que cette version ne gère pas encore."
                    : "Cette facture a reçu un règlement partiel : son montant ne peut plus changer sous les pieds de celui qui a déjà payé."}
              </p>
            )}
          </div>
        </Panneau>

        <p className="text-sm text-ardoise">
          <Link
            href="/superviseur/interventions"
            className="underline decoration-signal decoration-2 underline-offset-4"
          >
            Voir toutes les interventions
          </Link>
        </p>
      </div>
    </div>
  );
}
